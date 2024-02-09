import axios from 'axios';
import FormData from 'form-data';

//#region interfaces
export interface IAddResult {
  Hash: string;
  Size: number;
}

export interface IObject {
  Hash: string;
  Links: IEntry[];
}

export interface IClientError {
  status: number;
  statusText: string;
  message: string;
  error?: any;
}

export interface IStat {
  Hash: string;
  Size: number;
  CumulativeSize: number;
  /**
   * file, directory
   */
  Type: string;
}

export interface IEntry {
  Name: string;
  /**
   * 0 = file, 1 = directory
   */
  Type: number;
  Hash: string;
  /**
   * 0 if directory, greater otherwise
   */
  Size: number;
}

export interface IKeyGenResult {
  Id: string;
  Name: string;
}

export interface INamePublishResult {
  Name: string;
  Value: string;
}
//#endregion

//#region classes

export class ClientError implements IClientError {
  status: number;
  statusText: string;
  message: string;
  error?: any;

  constructor(err: any) {
    console.error(err);
    this.error = err;
    this.status = this.error.response.status;
    this.statusText = this.error.response.statusText;
    this.message = this.error.response.data?.Message;

    if (!this.message && typeof this.error.response.data === 'string') {
      this.message = this.error.response.data;
    }
  }
}
//#endregion

export class IpfsKuboRpcHttpClient {
  private url: string;

  public files: Files;
  public key: Key;
  public name: Name;
  public pin: Pin;

  constructor(url: string) {
    this.url = url;
    this.files = new Files(url);
    this.key = new Key(url);
    this.name = new Name(url);
    this.pin = new Pin(url);
  }

  public async add(params: { content: any }): Promise<IAddResult> {
    try {
      const form = new FormData();
      form.append('file', params.content);

      const res = await axios.post(`${this.url}/add?cid-version=1`, form);

      return res.data;
    } catch (err) {
      throw new ClientError(err);
    }
  }
}

export class Files {
  private url: string;
  constructor(url: string) {
    this.url = url;
  }

  public async write(params: {
    content: any;
    path: string;
    create?: boolean;
    parents?: boolean;
  }): Promise<boolean> {
    params.create = params.create || true;
    params.parents = params.parents || true;
    const form = new FormData();
    form.append('file', params.content);

    try {
      await axios.post(
        `${this.url}/files/write?arg=${params.path}&cid-version=1&create=${params.create}&parents=${params.parents}`,
        form,
      );
      return true;
    } catch (err) {
      throw new ClientError(err);
    }
  }

  /**
   * List all entries (files and directories) for path
   * @param params
   * @returns
   */
  public async ls(params: { path?: string }): Promise<IEntry[]> {
    try {
      const res = await axios.post(
        `${this.url}/files/ls?long=1${
          params.path ? '&arg=' + params.path : ''
        }`,
      );
      return res.data.Entries;
    } catch (err) {
      throw new ClientError(err);
    }
  }

  /**
   * Get properties of a object in given path
   * @param params
   * @returns
   */
  public async stat(params: { path: string }): Promise<IStat> {
    try {
      const objectStat = (
        await axios.post(`${this.url}/files/stat?arg=${params.path}`)
      ).data;
      console.info(objectStat);
      return objectStat;
    } catch (err) {
      throw new ClientError(err);
    }
  }
}

export class Key {
  private url: string;
  constructor(url: string) {
    this.url = url;
  }

  public async gen(params: {
    name: string;
    type?: string;
    size?: number;
  }): Promise<IKeyGenResult> {
    let urlParameters = '';
    urlParameters += params.type ? `&type=${params.type}` : '';
    urlParameters += params.size ? `&size=${params.size}` : '';

    try {
      const res = await axios.post(
        `${this.url}/key/gen?arg=${params.name}${urlParameters}`,
      );
      console.info(res);
      return res.data;
    } catch (err) {
      throw new ClientError(err);
    }
  }
}

export class Name {
  private url: string;
  constructor(url: string) {
    this.url = url;
  }

  public async publish(params: {
    cid: string;
    key: string;
    resolve: boolean;
    ttl?: string;
  }): Promise<INamePublishResult> {
    let urlParameters = ``;
    urlParameters += params.key ? `&key=${params.key}` : '&key=self';
    urlParameters += params.resolve ? `&resolve=true` : '&resolve=false';
    urlParameters += params.ttl ? `&ttl=${params.ttl}` : '';

    try {
      const res = await axios.post(
        `${this.url}/name/publish?arg=${params.cid}${urlParameters}`,
      );
      console.info(res);
      return res.data;
    } catch (err) {
      throw new ClientError(err);
    }
  }
}

export class Pin {
  private url: string;
  constructor(url: string) {
    this.url = url;
  }

  public async add(params: {
    /**
     * Path to object(s) to be pinned
     */
    cids: string[];
  }): Promise<boolean> {
    try {
      const res = await axios.post(
        `${this.url}/pin/add`,
        {},
        { params: { arg: params.cids }, paramsSerializer: { indexes: null } },
      );
      console.info(res);
      return true;
    } catch (err) {
      throw new ClientError(err);
    }
  }

  public async ls(params: { cid?: string }): Promise<any> {
    try {
      const res = await axios.post(
        `${this.url}/pin/ls${params.cid ? '?arg=' + params.cid : ''}`,
      );
      console.info(res);
      return res.data.Keys;
    } catch (err) {
      throw new ClientError(err);
    }
  }

  public async rm(params: {
    /**
     * Path to object(s) to be unpinned
     */
    cids: string[];
  }): Promise<boolean> {
    try {
      const res = await axios.post(
        `${this.url}/pin/rm`,
        {},
        { params: { arg: params.cids }, paramsSerializer: { indexes: null } },
      );
      console.info(res);
      return true;
    } catch (err) {
      throw new ClientError(err);
    }
  }
}
