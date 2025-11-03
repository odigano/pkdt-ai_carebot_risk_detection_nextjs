#!/bin/bash

REMOTE_DEPLOY_PATH="$1"

NEW_RELEASE_DIR="$REMOTE_DEPLOY_PATH/release/$(date +%Y%m%d%H%M%S)"
CURRENT_SYMLINK="$REMOTE_DEPLOY_PATH/current"
APP_IDENTIFIER="npm run start"

echo "--- DEPLOYMENT START ---"
echo "  Deploy Path: $REMOTE_DEPLOY_PATH"
echo "  New Release Directory: $NEW_RELEASE_DIR"

# 릴리스 디렉토리 생성
echo "Creating release directory $NEW_RELEASE_DIR"
mkdir -p "$NEW_RELEASE_DIR" || { echo "Error: Failed to create release directory"; exit 1; }

# Git 클론 및 패키지 설치
cd "$NEW_RELEASE_DIR"
git clone -b deploy git@github.com:odigano/pkdt-ai_carebot_risk_detection_nextjs.git . || { echo "Error: Failed to git clone"; exit 1; }
npm ci || { echo "Error: Failed to npm ci"; exit 1; }

# env 파일 복사
cp "$REMOTE_DEPLOY_PATH/env/.env" "$NEW_RELEASE_DIR/.env" || { echo "Error: Failed to copy env file"; exit 1; }

# 빌드
npm run build || { echo "Error: Failed to build"; exit 1; }

# 심볼릭 링크 업데이트
echo "Updating symbolic link to $NEW_RELEASE_DIR"
ln -sfn "$NEW_RELEASE_DIR" "$CURRENT_SYMLINK" || { echo "Error: Failed to update symbolic link"; exit 1; }

# 기존 Nextjs 프로세스 종료
echo "Checking for existing application processes ($APP_IDENTIFIER)..."

# grep 자신을 제외하고 APP_IDENTIFIER를 포함하는 프로세스 PID 찾기
PIDS=$(ps -ef | grep "$APP_IDENTIFIER" | grep -v grep | awk '{print $2}')

if [ -n "$PIDS" ]; then
    # 찾은 PID들로부터 고유한 PGID 목록을 추출
    PGIDS=$(ps -o pgid= -p $PIDS | tr -d ' ' | sort -u)
    
    echo "Found existing process groups (PGIDs: $PGIDS). Attempting graceful shutdown (SIGTERM)..."

    for PGID in $PGIDS; do
        if [ "$PGID" -le 1 ]; then
            echo "Skipping kill for invalid PGID: $PGID"
            continue
        fi
        
        echo "Terminating process group $PGID (SIGTERM)..."
        kill -15 -$PGID # 그룹 전체에 SIGTERM 전송
        
        for i in {1..5}; do # 5초 대기
            if ! kill -0 -$PGID 2>/dev/null; then
                echo "Process group $PGID terminated gracefully."
                break
            fi
            sleep 1
        done

        # SIGTERM 후에도 살아있으면 강제 종료
        if kill -0 -$PGID 2>/dev/null; then 
            echo "Process group $PGID did not terminate gracefully, forcing kill with SIGKILL."
            kill -9 -$PGID # 그룹 전체에 SIGKILL 전송
        fi
    done
else
    echo "No existing process found."
fi

# 모든 기존 프로세스가 종료되었는지 확인
sleep 2 # OS가 프로세스를 완전히 정리할 시간 대기
REMAINING_PIDS=$(ps -ef | grep "$APP_IDENTIFIER" | grep -v grep | awk '{print $2}')

if [ -n "$REMAINING_PIDS" ]; then
    echo "Error: Old application processes still running after termination attempt."
    echo "Remaining processes:"
    ps -ef | grep "$APP_IDENTIFIER" | grep -v grep
    exit 1
else
    echo "All old application processes terminated."
fi

# 로그 디렉토리 생성
echo "Creating log directory $REMOTE_DEPLOY_PATH/logs"
mkdir -p "$REMOTE_DEPLOY_PATH/logs" || { echo "Error: Failed to create log directory"; exit 1; }

# Nextjs 애플리케이션 시작
LOG_FILE="$REMOTE_DEPLOY_PATH/logs/next_start.log"
echo "Starting Nextjs application: nohup npm run start >> \"$LOG_FILE\" 2>&1 &"
nohup npm run start >> "$LOG_FILE" 2>&1 &
sleep 1

# 새 애플리케이션 시작 확인
echo "Verifying new application started..."
APP_STARTED=false
for i in {1..10}; do # 총 15초 대기 (1초 * 10회)
  sleep 1
  if pgrep -f "$APP_IDENTIFIER" >/dev/null; then
    echo "New application process found."
    APP_STARTED=true
    break
  fi
done

if [ "$APP_STARTED" = "false" ]; then
  echo "Error: New application did not start successfully."
  echo "Check logs for details: tail -n 50 \"$LOG_FILE\""
  exit 1
else
  echo "New application started successfully."
fi

# 오래된 릴리스 정리 (최신 5개 유지)
echo "Starting old release cleanup..."
CURRENT_RELEASE_TARGET=$(readlink -f "$CURRENT_SYMLINK" || echo "")

if [ -z "$CURRENT_RELEASE_TARGET" ]; then
  echo "Warning: Could not determine current release target for cleanup. Skipping old release cleanup."
else
  # 최신 5개를 제외한 나머지 목록 (readlink -f 결과와 동일한 경로로 필터링)
  OLD_RELEASES=$(ls -dt "$REMOTE_DEPLOY_PATH/release/"* 2>/dev/null | head -n -5 | grep -v "$CURRENT_RELEASE_TARGET")
  if [ -n "$OLD_RELEASES" ]; then
    echo "Old releases to delete:"
    echo "$OLD_RELEASES"
    for RELEASE_TO_DELETE in $OLD_RELEASES; do
      echo "Deleting old release directory: $RELEASE_TO_DELETE"
      rm -rf "$RELEASE_TO_DELETE"
    done
    echo "Old release cleanup completed."
  else
    echo "No old releases found to delete or less than 5 releases."
  fi
fi

echo "--- DEPLOYMENT END ---"
