import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool

from app.database import Base, get_db
from app.main import app
from app.models import Admin
from app.security import hash_password


def _enable_sqlite_fks(dbapi_connection, _connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


@pytest.fixture()
def client(tmp_path):
    engine = create_engine(
        f"sqlite:///{tmp_path / 'test.db'}",
        connect_args={"check_same_thread": False},
        poolclass=NullPool,
    )
    event.listen(engine, "connect", _enable_sqlite_fks)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    db.add(Admin(email="admin@farmer.com", password_hash=hash_password("Admin@123")))
    db.commit()
    db.close()

    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    engine.dispose()


@pytest.fixture()
def admin_token(client: TestClient) -> str:
    response = client.post("/api/auth/login", json={"email": "admin@farmer.com", "password": "Admin@123"})
    assert response.status_code == 200
    return response.json()["access_token"]


def auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def session_header(session_id: str = "guest-session-1") -> dict[str, str]:
    return {"X-Session-Id": session_id}


def create_product(client: TestClient, token: str, **overrides) -> dict:
    payload = {
        "name": "Tomatoes",
        "category": "Vegetables",
        "farmer_name": "Lakshmi Farms",
        "description": "Fresh tomatoes",
        "price": 40,
        "stock_quantity": 5,
        "image_url": "https://example.com/tomato.jpg",
        "is_active": True,
    }
    payload.update(overrides)
    response = client.post("/api/admin/products", json=payload, headers=auth_header(token))
    assert response.status_code == 201, response.text
    return response.json()
