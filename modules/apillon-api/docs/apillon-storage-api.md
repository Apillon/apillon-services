# Apillon STORAGE API

It is highly recomended, to first read [Apillon API](apillon-api.md) general docs, as they explain basic infrastructure, authentication and request-response system.

Apillon integrates multiple Polkadot parachains and offers them in unified way, as modules that can be used in developer console and through Apillon APIs.\
One of those parachains is [CRUST](https://crust.network/). \
Apillon STORAGE is WEB3 oriented storage, based on AWS S3(as cache to optimize upload of large files), [IPFS](https://ipfs.tech/) and CRUST.

In all cURL examples, parameters with colon as prefix, should be changed with real values.

## Storage bucket

Bucket is a virtual container which holds directories and files in hiearhical structure. Each directory can contain multiple subdirectories and multiple files, and so on and so forth for each subdirectory.\
To use Apillon STORAGE APIs, the developer must first create a bucket in Apillon developer console.

## File upload process through Apillon storage API

- Request signed URL for upload
- Upload file to Apillon (AWS s3 bucket - cache)
- Serverless workers will transfer file to IPFS
- File is pinned to CRUST, which ensures that the file is replicated to different IPFS nodes around the world

## Routes

### [private] POST /storage/:bucketUuid/upload

> API which creates file upload request and returns [AWS S3 signed URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) for file upload.

#### URL parameters

| Name       | Description                                                  |
| ---------- | ------------------------------------------------------------ |
| bucketUuid | Unique key of bucket. Key is displayed in developer console. |

#### Body fields

| Name        | Description                                                                                                                        | Required |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| fileName    | A `string` representing full name (name and extension) of file, that you want to upload                                            | `true`   |
| contentType | A `string` representing file [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types) | `true`   |
| path        | A `string` representing path to file. Path should not contain file name.                                                           | `false`  |

`path` field, can be used, to place file in virtual directories inside bucket. If directories does not yet exists, they will be automatically generated. \
For example `images/icons`, creates `images` directory in bucket and `icons` directory inside it. File will then be created in `icons` directory.

#### Possible errors

| Code     | Description                                                                   |
| -------- | ----------------------------------------------------------------------------- |
| 40406002 | Bucket does not exists.                                                       |
| 42200008 | Request body is missing `fileName` field                                      |
| 42200009 | Request body is missing `contentType` field                                   |
| 40006002 | Bucket has reached max size limit                                             |
| 40406009 | Bucket is marked for deletion. It is no longer possible to upload files to it |
| 50006003 | Internal error - Apillon was unable to generate S3 signed URL                 |

#### Response fields

| Field               | Description                                                                      |
| ------------------- | -------------------------------------------------------------------------------- |
| url                 | `string` AWS S3 signed URL for file upload                                       |
| fileUuid            | `string` File uniqie identifier. This UUID can be used to query file status, ... |
| fileUploadRequestId | `integer` Apillon internal ID of file upload request.                            |

#### Request cURL example

```
curl --location --request POST "https://api-dev.apillon.io/storage/:bucketUuid/upload" \
--header "Authorization: Basic :credentials" \
--header "Content-Type: application/json" \
--data-raw "{
    \"fileName\": \"My file.txt\",
    \"contentType\": \"text/plain\"
}"
```

#### Request response example

```JSON
{
    "id": "aea7f4e9-6dbb-4075-a76c-f6cc6c47c331",
    "status": 201,
    "data": {
        "url": "https://sync-to-ipfs-queue.s3.eu-west-1.amazonaws.com/STORAGE/11/my%20test%20file.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQIMRRA6GJRL57L7G%2F20230104%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20230104T101419Z&X-Amz-Expires=900&X-Amz-Signature=e1be26c5863d845d5ec5477ac4e7aabafd6901060b3515d23d36c71360255259&X-Amz-SignedHeaders=host",
        "fileUuid": "18bdb4ef-4b9d-4bd4-9e5f-0bc7744b4376",
        "fileUploadRequestId": 70
    }
}
```

#### Upload file to AWS S3 signed URL

Signed URL is unique for each file and is valid only for limited time (1 min), so you should start with file upload as soon as possible.
Request should use `PUT` method and `binary` body.

Binary data should be sent in body as-is, but with the appropriate Content-Type header (e.g. text/plain)

##### Request cURL example

Example with `string` as binary data.

```
curl --location --request PUT "https://sync-to-ipfs-queue.s3.eu-west-1.amazonaws.com/STORAGE/11/my%20test%20file.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQIMRRA6GJRL57L7G%2F20230104%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20230104T101419Z&X-Amz-Expires=900&X-Amz-Signature=e1be26c5863d845d5ec5477ac4e7aabafd6901060b3515d23d36c71360255259&X-Amz-SignedHeaders=host" \
--data-binary "my test content"
```

Example with `content-type` header and file from disk.

curl --location --request PUT "https://sync-to-ipfs-queue.s3.eu-west-1.amazonaws.com/STORAGE/11/my%20test%20file.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQIMRRA6GJRL57L7G%2F20230104%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20230104T101419Z&X-Amz-Expires=900&X-Amz-Signature=e1be26c5863d845d5ec5477ac4e7aabafd6901060b3515d23d36c71360255259&X-Amz-SignedHeaders=host" \
--header "Content-Type: text/plain" \
--data-binary ":full path to file"

### [private] GET /storage/:bucketUuid/content

> Gets directories and files in bucket. Items are paginated and can be filtered and ordered through query parameters.

#### URL parameters

| Name        | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| :bucketUuid | Unique key of bucket. Key is displayed in developer console. |

#### Query parameters

| Name         | Description                                                                           |
| ------------ | ------------------------------------------------------------------------------------- |
| :search      | Parameter to filter files by file name                                                |
| :directoryId | Get files inside specific directory.                                                  |
| :page        | Files are paginated by default. This parameter is used to get files in specific page  |
| :limit       | Number of files on page (default: 20)                                                 |
| :orderBy     | One or multiple properties, separated by comma, used to order data                    |
| :desc        | `Boolean` values, mapped to the index of the `orderBy` parameter. Defaults to `false` |

#### Possible errors

| Code     | Description             |
| -------- | ----------------------- |
| 40406002 | Bucket does not exists. |

#### Response fields

`Data` property of API response contains 2 properties: `items` (records that match current query) and `total` (number of all records. This information should be used for pagination: Round up (`total` / `limit`) = number of pages).

Properties of each item:

| Field             | Description                                                                 |
| ----------------- | --------------------------------------------------------------------------- |
| id                | `integer` Item internal ID                                                  |
| type              | `string` Representing item type. Possible values are `file` and `directory` |
| name              | `string` Representing item (file or directory) name                         |
| createTime        | `DateTime` Representing item create time                                    |
| updateTime        | `DateTime` Representing item last update time                               |
| contentType       | `string` Representing item content type (Mime type)                         |
| contentType       | `string` Representing item content type (Mime type)                         |
| size              | `integer` Representing item size in bytes                                   |
| parentDirectoryId | `integer` Representing ID of directory in which this file is located        |
| fileUuid          | `string` Representing file unique identifier                                |
| CID               | `string` File content identifier - label used to point to material in IPFS  |
| link              | `string` File link on Apillon IPFS gateway                                  |

#### Request cURL example

Basic request, to get items in bucket root directory.

```
curl --location --request GET "https://api-dev.apillon.io/storage/:bucketUuid/content" \
--header "Authorization: Basic :credentials"
```

Request, with additional query parameters
curl --location --request GET "https://api-dev.apillon.io/storage/:bucketUuid/content?orderBy=name&desc=false&limit=5&page=1" \
--header "Authorization: Basic :credentials"

#### Request response example

```JSON
{
    {
    "id": "c8c50b3b-91ff-42c7-b0af-f866ce23f18a",
    "status": 200,
    "data": {
        "items": [
            ...
            {
                "type": "file",
                "id": 397,
                "status": 5,
                "name": "My file.txt",
                "CID": "QmcG9r6Rdw9ZdJ4imGBWc6mi5VzWHQfkcLDMe2aP74eb42",
                "createTime": "2023-01-19T10:10:01.000Z",
                "updateTime": "2023-01-19T10:10:31.000Z",
                "contentType": "text/plain",
                "size": 68,
                "parentDirectoryId": null,
                "file_uuid": "0a775bfa-a0d0-4e0b-9a1e-e909e426bd11",
                "link": "https://ipfs.apillon.io/ipfs/QmcG9r6Rdw9ZdJ4imGBWc6mi5VzWHQfkcLDMe2aP74eb42"
            }
            ...
        ],
        "total": 10
    }
}
}
```

### [private] GET /storage/:bucketUuid/file/:id/detail

> Gets details of specific file inside bucket

#### URL parameters

| Name        | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| :bucketUuid | Unique key of bucket. Key is displayed in developer console. |
| :id         | File internal ID, UUID or CID                                |

#### Possible errors

| Code     | Description           |
| -------- | --------------------- |
| 40406005 | File does not exists. |

#### Response fields

Response `data` property contains two properties: `fileStatus` and `file`. File status tells us the current status of the file relative to the entire flow the file goes through to be fully loaded and pinned on CRUST, while `file` property holds file metadata fields.

##### File statuses

| Number | Description                                               |
| ------ | --------------------------------------------------------- |
| 1      | Request for upload to Apillon storage was generated.      |
| 2      | File uploaded to Apillon cache (AWS S3).                  |
| 3      | File transfered to IPFS node                              |
| 4      | File is replicated to different IPFS nodes, through CRUST |

##### File metadata

`CID`, `size` and `downloadLink` are present, if file is already loaded to IPFS

| Field                                                                    | Description                                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| id                                                                       | `integer` Apillon internal file ID                                         |
| status                                                                   | `integer` Apillon internal file status                                     |
| fileUuid                                                                 | `string` File unique identifier                                            |
| name                                                                     | `string` File name                                                         |
| contentType                                                              | `string` File content type (Mime type)                                     |
| [CID](https://docs.ipfs.tech/concepts/content-addressing/#what-is-a-cid) | `string` File content identifier - label used to point to material in IPFS |
| size                                                                     | `integer` File size in bytes                                               |
| downloadLink                                                             | `string` File link on Apillon IPFS gateway                                 |

#### Request cURL example

```
curl --location --request GET "https://api-dev.apillon.io/storage/:bucketUuid/file/:id/detail" \
--header "Authorization: Basic :credentials"
```

#### Request response example

```JSON
{
    "id": "5be33c54-2cc9-46f4-8f50-debc98866810",
    "status": 200,
    "data": {
        "fileStatus": 4,
        "file": {
            "id": 397,
            "status": 5,
            "file_uuid": "0a775bfa-a0d0-4e0b-9a1e-e909e426bd11",
            "CID": "QmcG9r6Rdw9ZdJ4imGBWc6mi5VzWHQfkcLDMe2aP74eb42",
            "name": "My file.txt",
            "contentType": "text/plain",
            "size": 68,
            "fileStatus": 4,
            "downloadLink": "https://ipfs.apillon.io/ipfs/QmcG9r6Rdw9ZdJ4imGBWc6mi5VzWHQfkcLDMe2aP74eb42"
        }
    }
}
```

### [private] DELETE /storage/:bucketUuid/file/:id

> Mark file inside bucket for deletion, by `id`, `fileUuid` or `CID`. File will be completly deleted from Apillon system and APillon IPFS node after 3 months.
> If file is marked for deletion, it is not getting renewed on CRUST.

#### URL parameters

| Name        | Description                                                  |
| ----------- | ------------------------------------------------------------ |
| :bucketUuid | Unique key of bucket. Key is displayed in developer console. |
| :id         | File internal ID, UUID or CID                                |

#### Possible errors

| Code     | Description                         |
| -------- | ----------------------------------- |
| 40406005 | File does not exists.               |
| 40006009 | File is already marked for deletion |

#### Response fields

Response of delete function is record, that is being marked for deletion.
Returned fields are same as fields, that are returned in [GET file details API](#file-metadata).

#### Request cURL example

```
curl --location --request DELETE "https://api-dev.apillon.io/storage/:bucketUuid/file/:id" \
--header "Authorization: Basic :credentials" \
--data-raw ""
```

#### Response example

```JSON
{
    "id": "bc92ff8d-05f2-4380-bb13-75a1b6b7f388",
    "status": 200,
    "data": {
        "id": 397,
        "status": 8,
        "file_uuid": "0a775bfa-a0d0-4e0b-9a1e-e909e426bd11",
        "CID": "QmcG9r6Rdw9ZdJ4imGBWc6mi5VzWHQfkcLDMe2aP74eb42",
        "name": "My file.txt",
        "contentType": "text/plain",
        "size": 68,
        "fileStatus": 4,
    }
}
```

Note, that `status` property of file is 8. This means, that the file is marked for deletion and will be deleted after a certain period.
