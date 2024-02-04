import axios from 'axios';
const FormData = require('form-data');

//#region interfaces
export interface IAddResult {
  cid: string;
  size: number;
  path: string;
}

export interface IClientError {
  status: number;
  statusText: string;
  message: string;
  error?: any;
}

export interface IStat {
  cid: string;
  size: number;
  path: string;
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
export class AddResult implements IAddResult {
  cid: string;
  size: number;
  path: string;

  constructor(cid: string, size: number, path: string) {
    this.cid = cid;
    this.size = size;
    this.path = path;
  }
}

export class ClientError implements IClientError {
  status: number;
  statusText: string;
  message: string;
  error?: any;

  constructor(err: any) {
    console.error(err);
    this.status = this.error.response.status;
    this.statusText = this.error.response.statusText;
    this.message = this.error.response.data?.Message;
    this.error = err;
  }
}
//#endregion

export class IpfsKuboRpcHttpClient {
  private url: string;

  public files: Files;
  public key: Key;
  public name: Name;

  constructor(url: string) {
    this.url = url;
    this.files = new Files(url);
    this.key = new Key(url);
    this.name = new Name(url);
  }

  public async add(params: { content: any; path: string }): Promise<AddResult> {
    try {
      const form = new FormData();
      form.append('file', params.content, { filepath: params.path });

      const res = await axios.post(`${this.url}/add?cid-version=1`, form);

      return new AddResult(res.data.Hash, +res.data.Size, res.data.Name);
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

  public async listDirectories(params: { path: string }) {
    try {
      const res = await axios.post(
        `${this.url}/files/ls?arg=${params.path}&long=1`,
      );
      console.info(res);
      return res;
    } catch (err) {
      throw new ClientError(err);
    }
  }

  public async list(params: { path: string }): Promise<IStat> {
    try {
      const objectStat = (
        await axios.post(`${this.url}/files/stat?arg=${params.path}`)
      ).data;
      console.info(objectStat);
      return {
        cid: objectStat.Hash,
        path: params.path,
        size: objectStat.CumulativeSize,
      };
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
    size?: string;
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
