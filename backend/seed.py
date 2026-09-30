import time

from sqlalchemy import text
from sqlalchemy.exc import OperationalError

from app.config import settings
from app.database import Base, SessionLocal, engine
from app.models import Admin, Product
from app.security import hash_password

PRODUCTS = [
    {
        "name": "Heirloom Tomatoes",
        "category": "Vegetables",
        "farmer_name": "Lakshmi Farms",
        "description": "Vine-ripened tomatoes picked the same morning, sold by the kilogram.",
        "price": 48,
        "stock_quantity": 40,
        "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Spinach Bunches",
        "category": "Vegetables",
        "farmer_name": "Green Valley",
        "description": "Tender spinach bunches, washed and tied at the farm.",
        "price": 30,
        "stock_quantity": 25,
        "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Alphonso Mangoes",
        "category": "Fruits",
        "farmer_name": "Ratnagiri Orchards",
        "description": "Seasonal Alphonso mangoes, sold by the dozen when the orchard is in harvest.",
        "price": 450,
        "stock_quantity": 15,
        "image_url": "https://images.unsplash.com/photo-1550825488-af28862c0df5?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Nendran Bananas",
        "category": "Fruits",
        "farmer_name": "Kerala Collective",
        "description": "A dozen ripe Nendran bananas from small holdings in Kerala.",
        "price": 60,
        "stock_quantity": 50,
        "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Sona Masuri Rice",
        "category": "Grains",
        "farmer_name": "Godavari Growers",
        "description": "Five-kilogram bag of aged Sona Masuri rice.",
        "price": 320,
        "stock_quantity": 30,
        "image_url": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Foxtail Millet",
        "category": "Grains",
        "farmer_name": "Deccan Millet Co",
        "description": "One kilogram of cleaned foxtail millet.",
        "price": 140,
        "stock_quantity": 20,
        "image_url": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Farm Fresh Milk",
        "category": "Dairy",
        "farmer_name": "Nandini Hills Dairy",
        "description": "One litre of chilled farm milk, bottled the same day.",
        "price": 68,
        "stock_quantity": 18,
        "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "A2 Ghee",
        "category": "Dairy",
        "farmer_name": "Sahyadri Dairy",
        "description": "500 ml of slow-cooked A2 ghee in a glass jar.",
        "price": 750,
        "stock_quantity": 12,
        "image_url": "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Turmeric Powder",
        "category": "Spices",
        "farmer_name": "Erode Spice Farm",
        "description": "200 g of stone-ground turmeric.",
        "price": 90,
        "stock_quantity": 35,
        "image_url": "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Black Pepper",
        "category": "Spices",
        "farmer_name": "Wayanad Pepper Co",
        "description": "100 g of whole black peppercorns.",
        "price": 180,
        "stock_quantity": 22,
        "image_url": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Sunflower Seeds",
        "category": "Flower Seeds",
        "farmer_name": "Nilgiri Bloom Farm",
        "description": "A packet of sunflower seeds. The flower head is packed with seeds.",
        "price": 40,
        "stock_quantity": 60,
        "image_url": "https://images.unsplash.com/photo-1470509037663-253afd7f0f51?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Daisy Seeds",
        "category": "Flower Seeds",
        "farmer_name": "Nilgiri Bloom Farm",
        "description": "Daisy seeds for a low bed of white flowers with yellow centers.",
        "price": 55,
        "stock_quantity": 45,
        "image_url": "https://images.unsplash.com/photo-1560717789-0ac7c58ac90a?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Watermelon Seeds",
        "category": "Fruit Seeds",
        "farmer_name": "Deccan Orchard",
        "description": "Open-pollinated watermelon seeds, packed for a home fruit patch.",
        "price": 35,
        "stock_quantity": 70,
        "image_url": "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=900&q=80",
    },
    {
        "name": "Pomegranate Seeds",
        "category": "Fruit Seeds",
        "farmer_name": "Deccan Orchard",
        "description": "Dried pomegranate seeds for planting a small fruit tree.",
        "price": 80,
        "stock_quantity": 28,
        "image_url": "https://images.unsplash.com/photo-1541344999736-83eca272f6fc?auto=format&fit=crop&w=900&q=80",
    },
]


def wait_for_db() -> None:
    last_error: Exception | None = None
    for _ in range(15):
        try:
            with engine.connect() as connection:
                connection.execute(text("SELECT 1"))
            return
        except OperationalError as exc:
            last_error = exc
            time.sleep(2)
    raise RuntimeError("Database is not ready") from last_error


def seed() -> None:
    wait_for_db()
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        admin = db.query(Admin).filter(Admin.email == settings.ADMIN_EMAIL).first()
        if admin is None:
            admin = db.query(Admin).order_by(Admin.id).first()
        if admin is None:
            db.add(Admin(email=settings.ADMIN_EMAIL, password_hash=hash_password(settings.ADMIN_PASSWORD)))
        else:
            admin.email = settings.ADMIN_EMAIL
            admin.password_hash = hash_password(settings.ADMIN_PASSWORD)
        replacements = {
            "Marigold Seeds": "Sunflower Seeds",
            "Zinnia Seeds": "Daisy Seeds",
        }
        for old_name, new_name in replacements.items():
            current = db.query(Product).filter(Product.name == old_name).first()
            incoming = next(item for item in PRODUCTS if item["name"] == new_name)
            if current is not None:
                current.name = incoming["name"]
                current.description = incoming["description"]
                current.image_url = incoming["image_url"]
        db.flush()
        existing_names = {row[0] for row in db.query(Product.name).all()}
        for product in PRODUCTS:
            if product["name"] not in existing_names:
                db.add(Product(**product, is_active=True))
        tomato = db.query(Product).filter(Product.name == "Heirloom Tomatoes").first()
        if tomato is not None and tomato.image_url and "1546470427" in tomato.image_url:
            tomato.image_url = PRODUCTS[0]["image_url"]
        mango = db.query(Product).filter(Product.name == "Alphonso Mangoes").first()
        mango_image = next(item["image_url"] for item in PRODUCTS if item["name"] == "Alphonso Mangoes")
        if mango is not None and mango.image_url and "1553279768" in mango.image_url:
            mango.image_url = mango_image
        db.commit()
    finally:
        db.close()


if __name__ == "__main__":
    seed()
