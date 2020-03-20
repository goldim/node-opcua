import { parseEndpointUrl } from "./core/tools";
import { IClient, IServer } from "./itransport";
import { Ws } from "./ws/ws";
import { Tcp } from "./tcp/tcp";
import { Fake } from "./fake/fake";

export class Factory {
    public static getClient(endpoint: string): IClient {
        const ep = parseEndpointUrl(endpoint);
        let transport: IClient;
        switch (ep.protocol) {
            case "opc.tcp:":
                transport = new Tcp.Client();
                return transport;
            case "ws:":
            case "websocket:":
                transport = new Ws.Client();
                return transport;
            case "fake:":
                transport = new Fake.Client();
                return transport;
            case "http:":
            case "https:FF":
            default:
                throw new Error("this transport protocol is currently not supported: " + ep.protocol);
        }
    }

    public static getServer(port: number, protocol: string): IServer {
        let transport: IServer;        

        switch (protocol) {
            case "opc.tcp":
                transport = new Tcp.Server(port);
                return transport;
            case "ws":
            case "websocket":
                transport = new Ws.Server(port);
                return transport;
            case "http":
            case "https":
            default:
                throw new Error("this transport protocol is currently not supported: " + protocol);
        }
    }
};