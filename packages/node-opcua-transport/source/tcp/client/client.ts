/**
 * @module node-opcua-transport
 */
import { Socket } from "net";
import { ErrorCallback } from "../../itransport"
import { IClient, IConnection, IStream } from "../../itransport";
import { TransportBase } from "../../core/transport_base";
import { IOperationTimer } from "../../core/OpTimer";

import * as _ from "underscore";
import * as debug from "node-opcua-debug";

import { assert } from "node-opcua-assert";

const doDebug = debug.checkDebugFlag(__filename);
const debugLog = debug.make_debugLog(__filename);

import { IState } from "./state/base"
import { Closed } from "./state/closed"
import { Factory } from "./state/factory"
import { SocketOpTimer } from "../socket_timer"

let counter = 0;

export interface IContext {
    protocolVersion: number;
    name: string;
    sendBufferSize: number;

    init(): void;
    isPassive(): boolean;
    getSocket(): Socket;
    getTimer(): IOperationTimer;
    serialize(messageChunk: Buffer): void;
    deserialize(messageChunk: Buffer, length: number): void;
    setSocket(socket: Socket): void;
    changeState(state: string): void;
    callErrorCb(err: Error): void;
    closeSocket(): void;
    getEndpointUrl(): string;

    emit(event: "connection_break"): boolean;
    emit(event: "close", err: Error | null): boolean;
    emitReady(): void;
}

export class Client extends TransportBase implements IClient, IConnection, IStream, IContext {
    private bPassive: boolean;
    private _socket: Socket | null;
    public _state!: IState;    
    private _stateFactory: Factory; 
    public protocolVersion: number;

    constructor(socket: Socket | null = null) {
        super();
        
        this.name = this.constructor.name + counter;
        counter += 1;
        
        this._socket = null;
        this.protocolVersion = 0;
        this._timer = new SocketOpTimer(this._socket);
        this._stateFactory = new Factory(this);
        this.bPassive = false;
        this.changeState("closed");

        if (socket)
        {
            this.bPassive = true;
            this._socket = socket;
            this.changeState("established");
        }        
    }

    public createConnection(protocol:string = ""): IConnection
    {
        return this;
    }

    public connect(url: string, callback: ErrorCallback): void {
        assert(arguments.length === 2);
        assert(_.isFunction(callback));
        
        this._errorCb = callback;
        this.endpoint = url;
        this._state.connect(url, callback);
    }

    public disconnect(callback: ErrorCallback): void {
        this._state.disconnect(callback);
    }

    public write(messageChunk: Buffer) {
        this._state.write(messageChunk);
    }

    public dispose(){
        if (doDebug) {
            debugLog(" ClientTCP_transport disposed");
        }

        if (this._socket) {
            this._socket.destroy();
            this._socket.removeAllListeners();
            this._socket = null;
        }
    }

    public isValid(): boolean {
        return this._socket !== null && !this._socket.destroyed && this._state.constructor.name != Closed.name;
    }

    public init(): void
    {
        this._serializer.init(this._onMessageReceived.bind(this), this._onWriteChunk.bind(this));
    }

    protected _onMessageReceived(messageChunk: Buffer): boolean
    {
        const hasCallback = this._timer.cancel(null, messageChunk);
        if (!hasCallback) {
            this.emit("message", messageChunk);
            return true;
        }
        return false;
    }

    protected _onWriteChunk(messageChunk: Buffer): boolean 
    {
        if (this._socket !== null) {
            this._socket.write(messageChunk);
            return true;
        }

        return false;
    }

    public close()
    {
        this.closeSocket();
    }

    public closeSocket(): void
    {
        if (this._socket) {
            this._socket.end();
            this._socket.destroy();
            // xx this._socket.removeAllListeners();
            this._socket = null;
        }
    }
    
    public changeState(state: string): void
    {
        this._state = this._stateFactory.getState(state);
        this._state.onChange();
    }

    public getSocket(): Socket
    {
        return this._socket!;
    }

    public setSocket(socket: Socket)
    {
        this._socket = socket;
    }

    public isPassive(): boolean
    {
        return this.bPassive;
    }

    public getTimer(): IOperationTimer
    {
        return this._timer;
    }

    public callErrorCb(err: Error): void
    {
        if (this._errorCb)
            this._errorCb(err);
    }

    public getEndpointUrl(): string
    {
        return this.endpoint;
    }

    public emitReady()
    {
        this.removeAllListeners("message");
        this.emit("connect", this);
    }
}