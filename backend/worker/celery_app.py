"""
Celery application — broker and result backend both use Redis.
Import this module wherever you need the `celery` instance.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))  # make backend/ importable

from celery import Celery
from config import settings

celery = Celery(
    "bawan",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=["worker.tasks"],
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    result_expires=3600,  # results live for 1 hour
)
