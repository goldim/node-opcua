
import { ErrorCallback, IClient, IConnection } from "../itransport"
import { TransportBase } from "../core/transport_base";

export class Client extends TransportBase implements IClient, IConnection {
    public protocolVersion: number;

    constructor(){
        super();
        this.protocolVersion = 0;
    }

    public createConnection(): IConnection {
        return this;
    }

    public disconnect(callback: ErrorCallback): void {
        console.log("disconnect fake");
    }

    public write(data: Buffer): void {
        console.log("write fake");
    }

    public connect(endpointUrl: string, callback: ErrorCallback): void {
        console.log("connect fake");
    }

    public isValid(): boolean {
        return false;
    }
    public dispose(): void {
    }
}