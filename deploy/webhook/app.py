"""
GitHub Webhook 接收服务
接收 GitHub push 事件，触发自动部署
"""
import os
import hmac
import hashlib
import subprocess
import logging
from datetime import datetime
from flask import Flask, request, jsonify

app = Flask(__name__)

# 配置
WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET', 'your-webhook-secret-change-me')
DEPLOY_SCRIPT = '/webhook/deploy.sh'
LOG_FILE = '/webhook/logs/webhook.log'

# 日志配置
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE) if os.path.exists(os.path.dirname(LOG_FILE)) else logging.StreamHandler(),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


def verify_signature(payload: bytes, signature: str) -> bool:
    """验证 GitHub Webhook 签名"""
    if not signature:
        return False

    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(expected, signature)


@app.route('/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({'status': 'ok', 'time': datetime.now().isoformat()})


@app.route('/webhook', methods=['POST'])
def webhook():
    """接收 GitHub Webhook"""
    # 验证签名
    signature = request.headers.get('X-Hub-Signature-256')
    if not verify_signature(request.data, signature):
        logger.warning('Invalid webhook signature')
        return jsonify({'error': 'Invalid signature'}), 403

    # 解析事件
    event = request.headers.get('X-GitHub-Event')
    payload = request.json

    logger.info(f'Received event: {event}')

    # 只处理 push 事件
    if event != 'push':
        return jsonify({'message': f'Ignored event: {event}'}), 200

    # 只处理 main 分支
    ref = payload.get('ref', '')
    if ref != 'refs/heads/main':
        logger.info(f'Ignored branch: {ref}')
        return jsonify({'message': f'Ignored branch: {ref}'}), 200

    # 获取提交信息
    commits = payload.get('commits', [])
    pusher = payload.get('pusher', {}).get('name', 'unknown')

    logger.info(f'Push from {pusher}, {len(commits)} commits')

    # 异步执行部署脚本
    try:
        subprocess.Popen(
            ['bash', DEPLOY_SCRIPT],
            stdout=open('/webhook/logs/deploy.log', 'a'),
            stderr=subprocess.STDOUT,
            start_new_session=True
        )
        logger.info('Deploy script started')
        return jsonify({
            'message': 'Deploy triggered',
            'pusher': pusher,
            'commits': len(commits)
        }), 200
    except Exception as e:
        logger.error(f'Failed to start deploy: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/logs', methods=['GET'])
def logs():
    """查看最近的部署日志"""
    try:
        with open('/webhook/logs/deploy.log', 'r') as f:
            lines = f.readlines()[-100:]  # 最后100行
        return ''.join(lines), 200, {'Content-Type': 'text/plain'}
    except FileNotFoundError:
        return 'No logs yet', 200


if __name__ == '__main__':
    os.makedirs('/webhook/logs', exist_ok=True)
    app.run(host='0.0.0.0', port=9000)
