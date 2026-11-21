from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..schemas import ChangePasswordIn, LoginIn, UserOut
from ..security import (
    DUMMY_HASH,
    clear_auth_cookie,
    client_ip,
    hash_password,
    login_limiter,
    set_auth_cookie,
    verify_password,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=UserOut)
def login(payload: LoginIn, request: Request, response: Response, db: Session = Depends(get_db)):
    key = f"login:{client_ip(request)}"
    if login_limiter.is_limited(key):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            "Too many failed login attempts. Please wait 15 minutes and try again.",
        )
    user = db.scalar(
        select(User).where(func.lower(User.username) == payload.username.strip().lower())
    )
    # Always run bcrypt so response time does not reveal whether the user exists.
    ok = verify_password(payload.password, user.password_hash if user else DUMMY_HASH)
    if not user or not ok or not user.is_active:
        login_limiter.hit(key)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid username or password.")

    login_limiter.reset(key)
    user.last_login_at = datetime.now(timezone.utc)
    db.commit()
    set_auth_cookie(response, user)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout():
    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_auth_cookie(response)
    return response


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/change-password", response_model=UserOut)
def change_password(
    payload: ChangePasswordIn,
    response: Response,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is incorrect.")
    user.password_hash = hash_password(payload.new_password)
    user.token_version += 1  # signs out every other session
    db.commit()
    set_auth_cookie(response, user)
    return user
