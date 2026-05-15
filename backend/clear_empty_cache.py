"""Run once to clear empty media cache entries so they get re-fetched."""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def main():
    client = AsyncIOMotorClient(settings.MONGO_URI)
    db = client[settings.MONGO_DB]
    result = await db.media_cache.delete_many({"results": {"$size": 0}})
    print(f"Deleted {result.deleted_count} empty cache entries")
    client.close()

asyncio.run(main())
