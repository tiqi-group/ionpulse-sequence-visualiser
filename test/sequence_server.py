from os.path import isfile
import socketio 
from flask import Flask
from flask_cors import CORS
import json
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from time import sleep
import socket
import itertools
import argparse

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--debug", help="Run flask server in debug mode", action="store_true")
    parser.add_argument("--file", required=False, default="ionpulse_seq_plot.json")
    args = parser.parse_args()
    plot_json_filename = args.file

    local_ip = socket.gethostbyname(socket.gethostname())
    protocols = ["http://"]
    hosts = ["localhost"]
    hosts += [local_ip]
    hosts += [socket.gethostname()]
    hosts += [socket.gethostname()+".lab"]
    ports = [8003, 3000]
    ports = [ f":{port}" for port in ports ]

    origins = [ ''.join(comb) for comb in itertools.product(protocols, hosts, ports)]

    app = Flask("Plot server")
    CORS(app, origins=origins)
    # create a Socket.IO server
    sio = socketio.Server(
            async_mode="threading",
            logging=True,
            cors_allowed_origins=origins
            )

    # wrap with a WSGI application
    app.wsgi_app = socketio.WSGIApp(sio, app.wsgi_app, socketio_path='ws/socket.io')

    @app.route("/Hardware/description")
    def description() -> str:
        d = dict()
        d["RFs"] = dict()
        d["TTLs"] = dict()
        for i in range(32):
            d["RFs"][f"RF{i}"] = {"name": f"RF{i}",
                                  "type": "single pass",
                                  "central_frequency": 100
                                  }
            d["TTLs"][f"TTL{i}"] = f"TTL{i}"
        
        out = dict()
        out = json.dumps(d)
        return f'{json.dumps(out)}'

    @app.route("/Hardware/scope_sequence")
    def scope_sequence() -> str:
        try:
            with open(plot_json_filename) as f:
                data = f.read()
            return json.dumps(data)
        except:
            pass

        return ""

    @app.route("/")
    def main() -> str:
        return ""
    
    class JsonChangeHandler(FileSystemEventHandler):
        def safe_emit(self):
            sleep(1)
            try:
                with open(plot_json_filename) as f:
                    data = f.read()
                    if len(data) > 0:
                        try:
                            json.loads(data)
                            sio.emit("notify",{"data": {
                                "name": "Hardware.scope_sequence",
                                "value": data
                                }})
                        except:
                            pass
            except:
                pass

        def on_modified(self, event):
            self.safe_emit()
            return super().on_modified(event)

        def on_created(self, event):
            self.safe_emit()
            return super().on_created(event)

    if not isfile(plot_json_filename):
        print(f"File {plot_json_filename} doesn't exist")
        exit(1)
    jsonChangeHandler = JsonChangeHandler()
    observer = Observer()
    observer.schedule(jsonChangeHandler, plot_json_filename)
    observer.start()

    app.run(host="0.0.0.0", port=8003, debug=args.debug)
    observer.stop()
    observer.join()
