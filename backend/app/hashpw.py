"""python -m app.hashpw — выдаёт scrypt-хеш пароля (читает пароль со stdin или из env SEG_NEW_PASSWORD)."""
import os
import sys

from .security import make_password_hash

pw = os.environ.get("SEG_NEW_PASSWORD") or sys.stdin.readline().rstrip("\n")
print(make_password_hash(pw))
