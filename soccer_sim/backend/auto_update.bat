
@echo off
cd /d E:\queenof1000s\Python-all\soccer_sim\backend
call venv\Scripts\activate
python update_teams.py >> logs\update_log.txt 2>&1
 