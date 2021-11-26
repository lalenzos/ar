import argparse
from flask import Flask, jsonify, request
from flask_cors import CORS

from controllers.code_summary_controller import CodeSummaryController

PORT = 8080
global rootPath
global files
global models

app = Flask(__name__, static_folder="")
# enable CORS for api endpoint
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})

# controllers
code_summary = CodeSummaryController()

# API routes
@app.route("/api/summary", methods = ["POST"])
def api_models():
    try:
        summary = code_summary.get_summary(request)
        if summary:
            response = jsonify(summary)
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response
    except:
        pass
    return "Bad request", "400"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--debug", default=True, action="store_true", help="Start the server in debug mode.")
    parser.add_argument("--port", default=PORT, type=int, action="store", help="Set the port for of the web server.")
    parser.add_argument("--host", default="127.0.0.1", type=str, action="store", help="Set the host of the web server.")
    parser.add_argument("--use-cache", dest="cached", action="store_true")
    parser.add_argument("--no-cache", dest="cached", action="store_false")
    parser.set_defaults(cached=False)
    args = parser.parse_args()

    port = args.port
    debug = args.debug
    host = args.host
    cached = args.cached

    app.run(use_reloader=debug, port=port, debug=debug, host=host)