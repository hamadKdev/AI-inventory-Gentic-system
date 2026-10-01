import os
import hashlib

from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

from fastapi import (
    FastAPI,
    HTTPException,
    Depends
)

from fastapi.security import (
    HTTPBearer,
    HTTPAuthorizationCredentials
)

from pydantic import (
    BaseModel,
    EmailStr,
    Field
)

from jose import (
    jwt,
    JWTError
)

from database import supabase


# =========================================================
# SETTINGS
# =========================================================

load_dotenv()

JWT_SECRET = os.getenv(
    "JWT_SECRET",
    "change-secret"
)

JWT_ALGORITHM = "HS256"

security = HTTPBearer()


# =========================================================
# APP
# =========================================================

app = FastAPI(
    title="Nowshera Shopping Mall Inventory API",
    version="1.0"
)


# =========================================================
# PASSWORD
# =========================================================

def hash_password(password):

    salt = os.urandom(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode(),
        salt,
        100000
    )

    return salt.hex() + ":" + password_hash.hex()


def verify_password(password, stored_password):

    try:

        salt_hex, hash_hex = stored_password.split(":")

        salt = bytes.fromhex(salt_hex)

        new_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode(),
            salt,
            100000
        )

        return new_hash.hex() == hash_hex

    except Exception:

        return False


# =========================================================
# JWT
# =========================================================

def create_token(user_id, role):

    payload = {

        "user_id": str(user_id),

        "role": role,

        "exp":
            datetime.now(timezone.utc)
            + timedelta(hours=24)
    }

    return jwt.encode(
        payload,
        JWT_SECRET,
        algorithm=JWT_ALGORITHM
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials
    = Depends(security)
):

    token = credentials.credentials

    try:

        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=[JWT_ALGORITHM]
        )

        user_id = payload.get("user_id")

        if not user_id:

            raise HTTPException(
                status_code=401,
                detail="Invalid token"
            )

    except JWTError:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    result = (
        supabase
        .table("users")
        .select("*")
        .eq("id", user_id)
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    user = result.data[0]

    if not user["is_active"]:

        raise HTTPException(
            status_code=403,
            detail="Account inactive"
        )

    return user


def manager_only(
    user=Depends(get_current_user)
):

    if user["role"] != "manager":

        raise HTTPException(
            status_code=403,
            detail="Manager access required"
        )

    return user


# =========================================================
# SCHEMAS
# =========================================================

class SignupRequest(BaseModel):

    name: str

    email: EmailStr

    password: str = Field(
        min_length=6
    )

    role: str = "staff"


class LoginRequest(BaseModel):

    email: EmailStr

    password: str


class ProductCreate(BaseModel):

    name: str

    category_id: str | None = None

    supplier_id: str | None = None

    quantity: int = Field(
        default=0,
        ge=0
    )

    reorder_level: int = Field(
        default=5,
        ge=0
    )

    cost_price: float = Field(
        default=0,
        ge=0
    )

    selling_price: float = Field(
        default=0,
        ge=0
    )


class ProductUpdate(BaseModel):

    name: str | None = None

    category_id: str | None = None

    supplier_id: str | None = None

    reorder_level: int | None = Field(
        default=None,
        ge=0
    )

    cost_price: float | None = Field(
        default=None,
        ge=0
    )

    selling_price: float | None = Field(
        default=None,
        ge=0
    )


class StockRequest(BaseModel):

    product_id: str

    quantity: int = Field(
        gt=0
    )

    note: str | None = None


class SaleRequest(BaseModel):

    product_id: str

    quantity: int = Field(
        gt=0
    )


class AIChatRequest(BaseModel):

    message: str


class AIConfirmRequest(BaseModel):

    request_id: str


# =========================================================
# HOME
# =========================================================

@app.get("/")
def home():

    return {
        "message":
            "Nowshera Shopping Mall Inventory API is running"
    }


# =========================================================
# DATABASE TEST
# =========================================================

@app.get("/test-db")
def test_database():

    try:

        result = (
            supabase
            .table("categories")
            .select("*")
            .limit(1)
            .execute()
        )

        return {
            "message": "Database connected",
            "data": result.data
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )


# =========================================================
# SIGNUP
# =========================================================

@app.post("/auth/signup")
def signup(request: SignupRequest):

    if request.role not in [
        "manager",
        "staff"
    ]:

        raise HTTPException(
            status_code=400,
            detail="Role must be manager or staff"
        )

    existing = (
        supabase
        .table("users")
        .select("id")
        .eq(
            "email",
            request.email
        )
        .execute()
    )

    if existing.data:

        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed = hash_password(
        request.password
    )

    result = (
        supabase
        .table("users")
        .insert({

            "name": request.name,

            "email": request.email,

            "password": hashed,

            "role": request.role,

            "is_active": True

        })
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=500,
            detail="Signup failed"
        )

    user = result.data[0]

    return {

        "message": "Signup successful",

        "user": {

            "id": user["id"],

            "name": user["name"],

            "email": user["email"],

            "role": user["role"]
        }
    }


# =========================================================
# LOGIN
# =========================================================

@app.post("/auth/login")
def login(request: LoginRequest):

    result = (
        supabase
        .table("users")
        .select("*")
        .eq(
            "email",
            request.email
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    user = result.data[0]

    if not user["is_active"]:

        raise HTTPException(
            status_code=403,
            detail="Account inactive"
        )

    if not verify_password(
        request.password,
        user["password"]
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_token(
        user["id"],
        user["role"]
    )

    return {

        "message":
            "Login successful",

        "access_token":
            token,

        "token_type":
            "bearer",

        "user": {

            "id": user["id"],

            "name": user["name"],

            "email": user["email"],

            "role": user["role"]
        }
    }


# =========================================================
# CURRENT USER
# =========================================================

@app.get("/auth/me")
def me(
    user=Depends(get_current_user)
):

    return {

        "id": user["id"],

        "name": user["name"],

        "email": user["email"],

        "role": user["role"]
    }


# =========================================================
# PRODUCTS
# =========================================================

@app.get("/products")
def get_products(
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("products")
        .select("*")
        .order(
            "created_at",
            desc=True
        )
        .execute()
    )

    products = result.data or []

    if user["role"] == "staff":

        for product in products:

            product.pop(
                "cost_price",
                None
            )

    return products


@app.get("/products/{product_id}")
def get_product(
    product_id: str,
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("products")
        .select("*")
        .eq(
            "id",
            product_id
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product = result.data[0]

    if user["role"] == "staff":

        product.pop(
            "cost_price",
            None
        )

    return product


@app.post("/products")
def create_product(
    product: ProductCreate,
    user=Depends(manager_only)
):

    result = (
        supabase
        .table("products")
        .insert(
            product.model_dump()
        )
        .execute()
    )

    return {

        "message":
            "Product created",

        "product":
            result.data[0]
    }


@app.put("/products/{product_id}")
def update_product(
    product_id: str,
    product: ProductUpdate,
    user=Depends(manager_only)
):

    data = {

        key: value

        for key, value
        in product.model_dump().items()

        if value is not None
    }

    if not data:

        raise HTTPException(
            status_code=400,
            detail="No data provided"
        )

    result = (
        supabase
        .table("products")
        .update(data)
        .eq(
            "id",
            product_id
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    return {

        "message":
            "Product updated",

        "product":
            result.data[0]
    }


# =========================================================
# STOCK IN
# =========================================================

@app.post("/stock/in")
def stock_in(
    request: StockRequest,
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("products")
        .select("*")
        .eq(
            "id",
            request.product_id
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product = result.data[0]

    old_quantity = product["quantity"]

    new_quantity = (
        old_quantity
        + request.quantity
    )

    supabase.table(
        "products"
    ).update({

        "quantity":
            new_quantity

    }).eq(
        "id",
        request.product_id
    ).execute()

    supabase.table(
        "stock_movements"
    ).insert({

        "product_id":
            request.product_id,

        "user_id":
            user["id"],

        "movement_type":
            "IN",

        "quantity":
            request.quantity,

        "old_quantity":
            old_quantity,

        "new_quantity":
            new_quantity,

        "note":
            request.note

    }).execute()

    return {

        "message":
            "Stock added",

        "old_quantity":
            old_quantity,

        "new_quantity":
            new_quantity
    }


# =========================================================
# STOCK OUT
# =========================================================

@app.post("/stock/out")
def stock_out(
    request: StockRequest,
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("products")
        .select("*")
        .eq(
            "id",
            request.product_id
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product = result.data[0]

    old_quantity = product["quantity"]

    if request.quantity > old_quantity:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Not enough stock. "
                f"Available: {old_quantity}"
            )
        )

    new_quantity = (
        old_quantity
        - request.quantity
    )

    supabase.table(
        "products"
    ).update({

        "quantity":
            new_quantity

    }).eq(
        "id",
        request.product_id
    ).execute()

    supabase.table(
        "stock_movements"
    ).insert({

        "product_id":
            request.product_id,

        "user_id":
            user["id"],

        "movement_type":
            "OUT",

        "quantity":
            request.quantity,

        "old_quantity":
            old_quantity,

        "new_quantity":
            new_quantity,

        "note":
            request.note

    }).execute()

    return {

        "message":
            "Stock removed",

        "old_quantity":
            old_quantity,

        "new_quantity":
            new_quantity
    }


# =========================================================
# SALE
# =========================================================

@app.post("/sales")
def sale(
    request: SaleRequest,
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("products")
        .select("*")
        .eq(
            "id",
            request.product_id
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product = result.data[0]

    old_quantity = product["quantity"]

    if request.quantity > old_quantity:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Not enough stock. "
                f"Available: {old_quantity}"
            )
        )

    new_quantity = (
        old_quantity
        - request.quantity
    )

    selling_price = float(
        product["selling_price"]
    )

    total = (
        selling_price
        * request.quantity
    )

    supabase.table(
        "products"
    ).update({

        "quantity":
            new_quantity

    }).eq(
        "id",
        request.product_id
    ).execute()

    supabase.table(
        "sales"
    ).insert({

        "product_id":
            request.product_id,

        "quantity":
            request.quantity,

        "selling_price":
            selling_price,

        "total_amount":
            total,

        "user_id":
            user["id"]

    }).execute()

    supabase.table(
        "stock_movements"
    ).insert({

        "product_id":
            request.product_id,

        "user_id":
            user["id"],

        "movement_type":
            "OUT",

        "quantity":
            request.quantity,

        "old_quantity":
            old_quantity,

        "new_quantity":
            new_quantity,

        "note":
            "Sale"

    }).execute()

    return {

        "message":
            "Sale recorded",

        "quantity_sold":
            request.quantity,

        "remaining_stock":
            new_quantity,

        "total_amount":
            total
    }


# =========================================================
# STOCK HISTORY
# =========================================================

@app.get("/stock/history")
def stock_history(
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("stock_movements")
        .select("*")
        .order(
            "created_at",
            desc=True
        )
        .execute()
    )

    return result.data or []


# =========================================================
# LOW STOCK
# =========================================================

@app.get("/reports/low-stock")
def low_stock(
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("products")
        .select("*")
        .execute()
    )

    products = result.data or []

    data = []

    for product in products:

        if (
            product["quantity"]
            <= product["reorder_level"]
        ):

            if user["role"] == "staff":

                product.pop(
                    "cost_price",
                    None
                )

            data.append(product)

    return data


# =========================================================
# DASHBOARD
# =========================================================

@app.get("/reports/dashboard")
def dashboard(
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("products")
        .select("*")
        .execute()
    )

    products = result.data or []

    total_products = len(products)

    total_units = sum(
        p["quantity"]
        for p in products
    )

    low_stock = sum(

        1

        for p in products

        if p["quantity"]
        <= p["reorder_level"]
    )

    response = {

        "total_products":
            total_products,

        "total_units":
            total_units,

        "low_stock_items":
            low_stock
    }

    if user["role"] == "manager":

        cost_value = sum(

            p["quantity"]
            * float(p["cost_price"])

            for p in products
        )

        selling_value = sum(

            p["quantity"]
            * float(p["selling_price"])

            for p in products
        )

        response[
            "inventory_cost_value"
        ] = cost_value

        response[
            "inventory_selling_value"
        ] = selling_value

    return response


# =========================================================
# SALES REPORT
# =========================================================

@app.get("/reports/sales")
def sales_report(
    user=Depends(manager_only)
):

    result = (
        supabase
        .table("sales")
        .select("*")
        .order(
            "created_at",
            desc=True
        )
        .execute()
    )

    return result.data or []


# =========================================================
# AI DATA
# n8n uses this endpoint
# =========================================================

@app.get("/ai/data")
def ai_data(
    user=Depends(get_current_user)
):

    products_result = (
        supabase
        .table("products")
        .select("*")
        .execute()
    )

    products = products_result.data or []

    # Never expose cost price to staff
    if user["role"] == "staff":

        for p in products:

            p.pop(
                "cost_price",
                None
            )

    sales_result = (
        supabase
        .table("sales")
        .select("*")
        .execute()
    )

    sales = sales_result.data or []

    low_stock = []

    for p in products:

        if (
            p["quantity"]
            <= p["reorder_level"]
        ):

            low_stock.append(p)

    return {

        "role":
            user["role"],

        "products":
            products,

        "sales":
            sales,

        "low_stock":
            low_stock
    }


# =========================================================
# AI PROPOSE CHANGE
# n8n calls this after understanding a change request
# =========================================================

@app.post("/ai/propose")
def ai_propose(
    product_id: str,
    action: str,
    quantity: int,
    note: str = "",
    user=Depends(get_current_user)
):

    if action not in [
        "ADD",
        "REMOVE"
    ]:

        raise HTTPException(
            status_code=400,
            detail="Action must be ADD or REMOVE"
        )

    if quantity <= 0:

        raise HTTPException(
            status_code=400,
            detail="Quantity must be greater than zero"
        )

    result = (
        supabase
        .table("products")
        .select("*")
        .eq(
            "id",
            product_id
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product = result.data[0]

    old_quantity = product["quantity"]

    if action == "ADD":

        new_quantity = (
            old_quantity
            + quantity
        )

    else:

        if quantity > old_quantity:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot remove {quantity}. "
                    f"Only {old_quantity} available."
                )
            )

        new_quantity = (
            old_quantity
            - quantity
        )

    result = (
        supabase
        .table("ai_change_requests")
        .insert({

            "user_id":
                user["id"],

            "product_id":
                product_id,

            "action":
                action,

            "quantity":
                quantity,

            "old_quantity":
                old_quantity,

            "new_quantity":
                new_quantity,

            "note":
                note,

            "status":
                "PENDING"

        })
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=500,
            detail="Could not create AI proposal"
        )

    proposal = result.data[0]

    return {

        "type":
            "confirmation_required",

        "request_id":
            proposal["id"],

        "product":
            product["name"],

        "action":
            action,

        "quantity":
            quantity,

        "old_quantity":
            old_quantity,

        "new_quantity":
            new_quantity,

        "message":
            (
                f"{product['name']}: "
                f"{old_quantity} → "
                f"{new_quantity}. "
                f"Please Confirm or Cancel."
            )
    }


# =========================================================
# AI CANCEL
# =========================================================

@app.post("/ai/cancel")
def ai_cancel(
    request: AIConfirmRequest,
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("ai_change_requests")
        .select("*")
        .eq(
            "id",
            request.request_id
        )
        .eq(
            "user_id",
            user["id"]
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    proposal = result.data[0]

    if proposal["status"] != "PENDING":

        raise HTTPException(
            status_code=400,
            detail="Request already processed"
        )

    supabase.table(
        "ai_change_requests"
    ).update({

        "status":
            "CANCELLED"

    }).eq(
        "id",
        request.request_id
    ).execute()

    return {

        "message":
            "AI stock change cancelled",

        "stock_changed":
            False
    }


# =========================================================
# AI CONFIRM
# =========================================================

@app.post("/ai/confirm")
def ai_confirm(
    request: AIConfirmRequest,
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("ai_change_requests")
        .select("*")
        .eq(
            "id",
            request.request_id
        )
        .eq(
            "user_id",
            user["id"]
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    proposal = result.data[0]

    if proposal["status"] != "PENDING":

        raise HTTPException(
            status_code=400,
            detail="Request already processed"
        )

    # Get latest product stock
    product_result = (
        supabase
        .table("products")
        .select("*")
        .eq(
            "id",
            proposal["product_id"]
        )
        .execute()
    )

    if not product_result.data:

        raise HTTPException(
            status_code=404,
            detail="Product not found"
        )

    product = product_result.data[0]

    current_stock = product["quantity"]

    # Recalculate using CURRENT stock
    if proposal["action"] == "ADD":

        new_stock = (
            current_stock
            + proposal["quantity"]
        )

    else:

        if proposal["quantity"] > current_stock:

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Cannot remove "
                    f"{proposal['quantity']}. "
                    f"Current stock is "
                    f"{current_stock}."
                )
            )

        new_stock = (
            current_stock
            - proposal["quantity"]
        )

    # Update stock
    update = (
        supabase
        .table("products")
        .update({
            "quantity":
                new_stock
        })
        .eq(
            "id",
            proposal["product_id"]
        )
        .execute()
    )

    if not update.data:

        raise HTTPException(
            status_code=500,
            detail="Stock update failed"
        )

    movement_type = (
        "IN"
        if proposal["action"] == "ADD"
        else "OUT"
    )

    # History
    supabase.table(
        "stock_movements"
    ).insert({

        "product_id":
            proposal["product_id"],

        "user_id":
            user["id"],

        "movement_type":
            movement_type,

        "quantity":
            proposal["quantity"],

        "old_quantity":
            current_stock,

        "new_quantity":
            new_stock,

        "note":
            "AI confirmed: "
            + (proposal["note"] or "")

    }).execute()

    # Mark proposal confirmed
    supabase.table(
        "ai_change_requests"
    ).update({

        "status":
            "CONFIRMED",

        "confirmed_at":
            datetime.now(timezone.utc).isoformat()

    }).eq(
        "id",
        request.request_id
    ).execute()

    return {

        "message":
            "AI stock change confirmed",

        "stock_changed":
            True,

        "old_quantity":
            current_stock,

        "new_quantity":
            new_stock
    }


# =========================================================
# AI PROPOSAL DETAILS
# =========================================================

@app.get("/ai/request/{request_id}")
def get_ai_request(
    request_id: str,
    user=Depends(get_current_user)
):

    result = (
        supabase
        .table("ai_change_requests")
        .select("*")
        .eq(
            "id",
            request_id
        )
        .eq(
            "user_id",
            user["id"]
        )
        .execute()
    )

    if not result.data:

        raise HTTPException(
            status_code=404,
            detail="Request not found"
        )

    return result.data[0]

