from redis import Redis
from rq import Worker

from app.settings import get_settings

settings = get_settings()
redis = Redis.from_url(settings.redis_url)

if __name__ == "__main__":
    worker = Worker([settings.queue_name], connection=redis)
    worker.work(with_scheduler=False)
