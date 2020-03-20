export type ErrorCallback = (err?: Error) => void;
export type ConnectCallback = (con: IStream) => void;
export type AcceptCallback = (con: IStream) => void;

export interface IConnection extends IDisposable {
    numberOfRetry: number;
    endpoint: string;

    connect(endpointUrl: string, callback: ErrorCallback): void;
    disconnect(callback: ErrorCallback): void;

    isValid(): boolean;

    on(event: 'connection_break', cb: () => void): this;
    on(event: 'close', cb: ErrorCallback): this;
    on(event: 'error', cb: ErrorCallback): this;
    on(event: 'connect', cb: ConnectCallback): this;

    addListener(event: 'connection_break', cb: () => void): this;
    addListener(event: 'close', cb: ErrorCallback): this;
    addListener(event: 'error', cb: ErrorCallback): this;
    addListener(event: 'connect', cb: ConnectCallback): this;
}

export interface IStream extends IDisposable {
    bytesWritten: number;
    bytesRead: number;
    sendBufferSize: number;
    receiveBufferSize: number;

    write(data: Buffer): void;
    close(): void;

    on(event: 'message', cb: (data: Buffer) => void): this;
    on(event: 'error', cb: ErrorCallback): this;
    on(event: 'close', cb: ErrorCallback): this;

    addListener(event: 'message', cb: (data: Buffer) => void): this;
    addListener(event: 'error', cb: ErrorCallback): this;
    addListener(event: 'close', cb: ErrorCallback): this;
}

interface IDisposable
{
    dispose(): void;
}

export interface IClient extends IDisposable {
    protocolVersion: number;
    name: string;
    timeout: number;

    createConnection(protocol: string): IConnection;
};

export interface IServer extends IDisposable {
    maxConnections: number;

    on(event: 'error', listener: ErrorCallback): this;
    on(event: 'connection', listener: AcceptCallback): this;
    on(event: 'listening', listener: () => void): this;

    addListener(event: 'error', listener: ErrorCallback): this;
    addListener(event: 'connection', listener: (stream: IStream) => void): this;
    addListener(event: 'listening', listener: () => void): this;
    
    listen(cb: ErrorCallback): void;
    isListening(): boolean;
    setAcceptHandler(cb: AcceptCallback): void;
    close(cb: (err?: Error) => void): void;
};