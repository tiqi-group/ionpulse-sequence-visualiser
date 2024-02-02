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

    app = Flask("Sequence server")
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
        n_ttls = 32
        n_rfs = 32
        n_pmts = 8
        try:
            with open(plot_json_filename) as f:
                data = f.read()
                if len(data) > 0:
                    try:
                        seq = json.loads(data)
                        ch_keys = list(seq.keys())
                        n_ttls = len([s for s in ch_keys if "TTL" in s])
                        n_rfs = len([s for s in ch_keys if "RF" in s])
                        n_pmts = len([s for s in ch_keys if "PMT" in s])
                    except:
                        pass
        except:
            pass
        d = dict()
        d["RFs"] = dict()
        for i in range(n_rfs):
            d["RFs"][f"RF{i}"] = {"name": f"RF{i}",
                                  "type": "single pass",
                                  "central_frequency": 100,
                                  "order": 1,
                                  "dds_channels":[i]
                                  }

        d["TTLs"] = dict()
        for i in range(n_ttls):
            d["TTLs"][f"TTL{i}"] = f"TTL{i}"

        d["PMTs"] = dict()
        for i in range(n_pmts):
            d["PMTs"][f"PMT{i}"] = f"PMT{i}"
        
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
    def index() -> str:
        return "Index page"
    
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
