# Apillon Storage API

It is highly recomended, to first read [Apillon API](apillon-api.md) general docs, as they explain basic infrastructure, authentication and request-response system.

Apillon integrates multiple Polkadot parachains and offers them in unified way, as modules that can be used in developer console and through Apillon APIs.
One of those parachains is [CRUST](https://crust.network/).
Apillon STORAGE is WEB3 oriented storage, based on AWS S3(as cache to optimize upload of large files), [IPFS](https://ipfs.tech/) and CRUST.

In all cURL examples, parameters with colon as prefix, should be changed with real values.

## Storage bucket

Bucket is a virtual container which holds directories and files in hiearhical structure. Each directory can contain multiple subdirectories and multiple files, and so on and so forth for each subdirectory.
To use Apillon STORAGE APIs, the developer must first create a bucket in Apillon developer console.

## File upload process through Apillon storage API

- Request signed URL for upload
- Upload file to Apillon (AWS s3 bucket - cache)
- Serverless workers will transfer file to IPFS
- File is pinned to CRUST, which ensures that the file is replicated to different IPFS nodes around the world

#### Upload file to AWS S3 signed URL

Signed URL is unique for each file and is valid only for limited time (1 min), so you should start with file upload as soon as possible.
Request should use `PUT` method and `binary` body.

Binary data should be sent in body as-is, but with the appropriate Content-Type header (e.g. text/plain)

For detailed documentation about all current storage API routes and their respective URLs, parameters and response types, refer to https://wiki.apillon.io/build/2-storage-api.html