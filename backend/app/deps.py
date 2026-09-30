from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Admin
from app.security import decode_access_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_session_id(x_session_id: str = Header(..., alias="X-Session-Id")) -> str:
    session_id = x_session_id.strip()
    if not session_id or len(session_id) > 64:
        raise HTTPException(status_code=400, detail="Invalid session id")
    return session_id


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Admin:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")
    email = decode_access_token(credentials.credentials)
    if email is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    admin = db.query(Admin).filter(Admin.email == email).first()
    if admin is None:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
    return admin
