import argparse
from flask import Flask, jsonify
from flask_cors import CORS


PORT = 8080
global rootPath
global files
global models

app = Flask(__name__, static_folder='')
# enable CORS for api endpoint
cors = CORS(app, resources={r"/api/*": {"origins": "*"}})

# controllers


# API routes
@app.route('/api/models')
def api_models():
    response = jsonify()
    response.headers.add('Access-Control-Allow-Origin', '*')
    return response


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--debug', default=False, action='store_true', help='Start the server in debug mode.')
    parser.add_argument('--port', default=PORT, type=int, action='store', help='Set the port for of the web server.')
    parser.add_argument('--host', default='127.0.0.1', type=str, action='store', help='Set the host of the web server.')
    parser.add_argument('--use-cache', dest='cached', action='store_true')
    parser.add_argument('--no-cache', dest='cached', action='store_false')
    parser.set_defaults(cached=False)
    args = parser.parse_args()

    port = args.port
    debug = args.debug
    host = args.host
    cached = args.cached

    print("Starting WebServer on host " + host + ":" + str(port))

    # registeredModels = repository.query_all_models(cached = cached)

    # for model_description in registeredModels:
    #     models[model_description.id] = ModelInstance(model_description)

    app.run(use_reloader=debug, port=port, debug=debug, host=host)

    # print("Open http://" + host + ":" + str(port) + "/api/models to see the available language models")