'''
Function:
    musicdl HTTP 服务（Flask 常驻内存模式）
    提供 RESTful API 接口，支持 musicdl 的所有功能：
    - 搜索音乐
    - 下载音乐
    - 解析歌单
    - 搜索歌词
    - 获取可用音乐源列表
    - 任务状态查询
    - 下载文件获取
'''
import os
import sys
from pathlib import Path
from flask import Flask, request, jsonify, send_file, render_template, send_from_directory
from flask_cors import CORS

# 导入公共 API 处理模块
_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

import api_handler
from musicdl.modules import MusicClientBuilder

# ======================== Flask 应用初始化 ========================

app = Flask(__name__, static_folder='static', static_url_path='/static')
CORS(app)

# ======================== 辅助函数 ========================

def _flask_response(result):
    """将 api_handler 的 (status_code, dict) 返回值转换为 Flask 响应"""
    code, data = result
    # 特殊处理文件下载
    if code == 200 and isinstance(data, dict) and data.get('_file_download'):
        return send_file(data['path'], as_attachment=True, download_name=data['filename'])
    return jsonify(data), code

# ======================== 前端页面路由 ========================

@app.route('/')
def index():
    """前端 SPA 入口页"""
    dist_index = os.path.join(_SCRIPT_DIR, 'static', 'dist', 'index.html')
    if os.path.isfile(dist_index):
        return send_from_directory(os.path.join(_SCRIPT_DIR, 'static', 'dist'), 'index.html')
    return '<h2>前端未构建，请先执行: cd frontend && npm install && npm run build</h2>', 404


@app.route('/assets/<path:path>')
def serve_assets(path):
    """托管前端构建产物中的 assets"""
    return send_from_directory(os.path.join(_SCRIPT_DIR, 'static', 'dist', 'assets'), path)


# ======================== API 路由 ========================

@app.route('/api/sources', methods=['GET'])
def get_sources():
    """获取所有已注册的音乐源列表"""
    return _flask_response(api_handler.handle_get_sources())


@app.route('/api/search', methods=['POST'])
def search_music():
    """搜索音乐（同步）"""
    data = request.get_json(force=True, silent=True) or {}
    return _flask_response(api_handler.handle_search(data))


@app.route('/api/search/async', methods=['POST'])
def search_music_async():
    """异步搜索音乐"""
    data = request.get_json(force=True, silent=True) or {}
    return _flask_response(api_handler.handle_search_async(data))


@app.route('/api/download', methods=['POST'])
def download_music():
    """下载音乐（异步任务）"""
    data = request.get_json(force=True, silent=True) or {}
    return _flask_response(api_handler.handle_download(data))


@app.route('/api/search_and_download', methods=['POST'])
def search_and_download():
    """搜索并自动下载（异步任务）"""
    data = request.get_json(force=True, silent=True) or {}
    return _flask_response(api_handler.handle_search_and_download(data))


@app.route('/api/playlist/parse', methods=['POST'])
def parse_playlist():
    """解析歌单（异步任务）"""
    data = request.get_json(force=True, silent=True) or {}
    return _flask_response(api_handler.handle_parse_playlist(data))


@app.route('/api/playlist/download', methods=['POST'])
def download_playlist():
    """解析歌单并下载（异步任务）"""
    data = request.get_json(force=True, silent=True) or {}
    return _flask_response(api_handler.handle_download_playlist(data))


@app.route('/api/lyrics/search', methods=['POST'])
def search_lyrics():
    """搜索歌词"""
    data = request.get_json(force=True, silent=True) or {}
    return _flask_response(api_handler.handle_search_lyrics(data))


@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task_status(task_id):
    """查询异步任务状态"""
    return _flask_response(api_handler.handle_get_task(task_id))


@app.route('/api/tasks', methods=['GET'])
def list_tasks():
    """获取所有任务列表"""
    return _flask_response(api_handler.handle_list_tasks(
        status_filter=request.args.get('status'),
        type_filter=request.args.get('type'),
        limit=int(request.args.get('limit', 50)),
    ))


@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """删除任务记录"""
    return _flask_response(api_handler.handle_delete_task(task_id))


@app.route('/api/files/download', methods=['GET'])
def download_file():
    """下载已下载的音乐文件"""
    file_path = request.args.get('path', '').strip()
    return _flask_response(api_handler.handle_download_file(file_path))


@app.route('/api/files/delete', methods=['DELETE'])
def delete_file_api():
    """删除指定文件或目录"""
    data = request.get_json(force=True, silent=True) or {}
    file_path = data.get('path', '').strip()
    return _flask_response(api_handler.handle_delete_file(file_path))


@app.route('/api/files/list', methods=['GET'])
def list_files():
    """列出工作目录下已下载的文件"""
    return _flask_response(api_handler.handle_list_files(
        work_dir=request.args.get('work_dir'),
        recursive=request.args.get('recursive', 'false').lower() == 'true',
    ))


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return _flask_response(api_handler.handle_health())


@app.route('/api/docs', methods=['GET'])
def api_docs():
    """API 文档页面"""
    return render_template('api_docs.html')

# ======================== 主入口 ========================

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description='musicdl HTTP 服务')
    parser.add_argument('--host', default='0.0.0.0', help='监听地址 (默认: 0.0.0.0)')
    parser.add_argument('--port', type=int, default=8866, help='监听端口 (默认: 8866)')
    parser.add_argument('--debug', action='store_true', help='开启调试模式')
    parser.add_argument('--work-dir', default=os.environ.get('MUSICDL_WORK_DIR', '.'), help='服务工作目录 (默认: 环境变量 MUSICDL_WORK_DIR 或当前目录)')
    args = parser.parse_args()
    api_handler.set_work_dir(args.work_dir)
    print(f'''
╔══════════════════════════════════════════════════════╗
║           musicdl HTTP 服务启动                       ║
║                                                      ║
║  模式: Flask 常驻内存                                 ║
║  地址: http://{args.host}:{args.port}                         ║
║  前端页面: http://{args.host}:{args.port}/                     ║
║  API 文档: http://{args.host}:{args.port}/api/docs            ║
║  工作目录: {args.work_dir:<40s}  ║
║  音乐输出: {os.path.join(args.work_dir, 'musicdl_outputs'):<40s}  ║
║  已注册音乐源: {len(MusicClientBuilder.REGISTERED_MODULES)} 个                            ║
╚══════════════════════════════════════════════════════╝
    ''')
    app.run(host=args.host, port=args.port, debug=args.debug, threaded=True)
