"""
scheduler.py — 매일 자동 팀 데이터 갱신
한국시간 오후 6시 (UTC 09:00) 실행
"""
import asyncio
import schedule
import time
from datetime import datetime
from update_teams import main as update_main

def job():
    kst = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n[{kst}] 자동 갱신 시작...")
    asyncio.run(update_main())
    print(f"[{kst}] 자동 갱신 완료\n")

# 한국시간 18:00 = UTC 09:00
schedule.every().day.at("09:00").do(job)

print("⏰ 스케줄러 시작 — 매일 KST 18:00 자동 갱신")
print("   Ctrl+C로 종료\n")

while True:
    schedule.run_pending()
    time.sleep(60)
