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
    parser.add_argument("--plot", required=False, default="ionpulse_seq_plot.json")
    parser.add_argument("--file", required=False, default="ionpulse_seq.json")
    args = parser.parse_args()

    protocols = ["http://"]
    hosts = ["localhost"]
    try:
        local_ip = socket.gethostbyname(socket.gethostname())
        hosts += [local_ip]
    except:
        print("Can't retrieve local ip");
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

    def get_channel_name(channel_map, i):
        for key in channel_map:
            if channel_map[key] == i:
                return key

            if isinstance(channel_map[key], list):
                for map_idx, sub_map in enumerate(channel_map[key]):
                    for sub_key in sub_map:
                        if sub_map[sub_key] == i:
                            return f"{key} Unit {map_idx} {sub_key}"
        return f"RF {i}"

    @app.route("/Hardware/description")
    def description() -> str:
        n_ttls = 32
        n_rfs = 32
        n_pmts = 8
        channel_index_to_name = {}
        try:
            with open(args.file) as f:
                data = f.read()
                if len(data) > 0:
                    try:
                        seq = json.loads(data)
                        main_seq = seq["Sequence"][-1]
                        n_ttls = 32 if main_seq["ch_mask"]["digital_io"] else 0
                        n_pmts = 8 if main_seq["ch_mask"]["digital_io"] else 0
                        n_rfs = main_seq["ch_mask"]["rf"].bit_count()
                        for i in range(n_rfs):
                            channel_index_to_name[i] = get_channel_name(seq["Header"]["channel_map"], i)
                    except:
                        pass
        except:
            pass
        d = dict()
        d["RFs"] = dict()
        for i in range(n_rfs):
            if i not in channel_index_to_name:
                channel_index_to_name[i] = f"RF {i}"
            d["RFs"][f"RF{i}"] = {
                    "name": channel_index_to_name[i],
                    "type": "single pass",
                    "central_frequency": 100,
                    "order": 1,
                    "dds_channels":[i]
                    }

        d["TTLs"] = dict()
        for i in range(n_ttls):
            d["TTLs"][f"TTL{i}"] = {
                    "name": f"TTL {i}"
                    }

        d["PMTs"] = dict()
        for i in range(n_pmts):
            d["PMTs"][f"PMT{i}"] = {
                    "name": f"PMT {i}"
                    }
        
        # Double dump to return a properly escaped string
        return json.dumps(json.dumps(d))

    @app.route("/Hardware/sequence")
    def sequence() -> str:
        try:
            with open(args.file) as f:
                data = json.load(f)
            # Double dump to return a properly escaped string
            return json.dumps(json.dumps(data))
        except:
            pass

        return ""

    @app.route("/")
    def index() -> str:
        return "Index page"
    
    class JsonChangeHandler(FileSystemEventHandler):
        def __init__(self, name, filename):
            self.name = name
            self.filename = filename

        def safe_emit(self):
            sleep(1)
            try:
                with open(self.filename) as f:
                    data = f.read()
                    if len(data) > 0:
                        try:
                            json.loads(data)
                            sio.emit("notify",{"data": {
                                "name": f"Hardware.{self.name}",
                                "value": data
                                }})
                        except:
                            print(f"Can't emit notification for change in file {self.filename}")

            except:
                print(f"Can't open file {self.filename}")

        def on_modified(self, event):
            self.safe_emit()
            return super().on_modified(event)

        def on_created(self, event):
            self.safe_emit()
            return super().on_created(event)

    files = [args.file]
    file_types = ["sequence"]
    observer = Observer()
    handlers = []
    for file, file_type in zip(files, file_types):
        if not isfile(file):
            print(f"File {file} doesn't exist")
            exit(1)
        handler = JsonChangeHandler(file_type, file)
        # Recursive is needed on mac for example. In any case, it doesn't hurt
        observer.schedule(handler, file, recursive=True)
        handlers.append(handler)

    observer.start()

    try:
        app.run(host="0.0.0.0", port=8003, debug=args.debug)
    finally:
        observer.stop()
        observer.join()
