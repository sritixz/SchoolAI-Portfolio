from pydantic import BaseModel
from typing import Optional

class Notification(BaseModel):
    id: str
    user_id: str
    type: str           # homework_new | homework_due | achievement | overdue | alert
    title: str
    desc: str
    tag: Optional[str] = None
    tag_color: Optional[str] = None
    time: Optional[str] = None
    read: bool = False
    action: Optional[str] = None
