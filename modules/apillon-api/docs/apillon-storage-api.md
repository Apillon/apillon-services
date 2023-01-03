# Apillon STORAGE API

Apillon integrates multiple Polkadot parachains and offers them in unified way, as modules that can be used in developer console and through Apillon APIs.\
One of those parachains is [CRUST](https://crust.network/). \
Apillon STORAGE is WEB3 oriented storage, based on AWS S3(as cache to optimize upload of large files), [IPFS](https://ipfs.tech/) and CRUST.\

## File upload process through Apillon storage API

## Routes

### [private] POST /storage/:bucket_uuid/upload

> API which creates file upload request and returns [AWS S3 signed URL](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html) for file upload.

#### URL parameters

| Name         | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| :bucket_uuid | Unique key of bucket. Key is displayed in developer console. |

#### Body fields

| Name        | Description                                                                                                                        | Required |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- |
| fileName    | A `string` representing full name (name and extension) of file, that you want to upload                                            | `true`   |
| contentType | A `string` representing file [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types/Common_types) | `true`   |
| path        | A `string` representing path to file. Path should not contain file name.                                                           | `false`  |

#### Possible errors

| Code     | Description                                                                         |
| -------- | ----------------------------------------------------------------------------------- |
| 40406002 | Bucket does not exists.                                                             |
| 42200008 | Request body is missing `fileName` field                                            |
| 42200009 | Request body is missing `contentType` field                                         |
| 40006002 | Size of all files that were uploaded to bucket, has reached `MAX BUCKET SIZE` limit |
| 50006003 | Internal error - Apillon was unable to generate S3 signed URL                       |

#### Response fields

| Field               | Description                                                                     |
| ------------------- | ------------------------------------------------------------------------------- |
| signedUrlForUpload  | `string`AWS S3 signed URL for file upload                                       |
| file_uuid           | `string`File uniqie identifier. This UUID can be used to query file status, ... |
| fileUploadRequestId | `integer`Internal ID of file upload request.                                    |

#### Request cURL example

```
curl --location --request POST "http://localhost:6002/storage/cee9f151-a371-495b-acd2-4362fbb87780/upload" \
--header "Authorization: Basic MTJhMTVmNmYtMzc3NC00MTVjLWE0MzMtYWZlYjA5OWY3NjM4OjAxVE1IVjVIKlZoSg==" \
--header "Content-Type: application/json" \
--data-raw "{
    \"fileName\": \"apillon api file 3.txt\",
    \"contentType\": \"text/plain\"
}"
```

#### Request response example

```JSON
{
    "id": "871e99ef-5812-4f4d-9d66-b41b4d58fccc",
    "status": 201,
    "data": {
        "signedUrlForUpload": "https://sync-to-ipfs-queue.s3.eu-west-1.amazonaws.com/STORAGE/11/apillon%20api%20file%203.txt?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQIMRRA6GJRL57L7G%2F20221230%2Feu-west-1%2Fs3%2Faws4_request&X-Amz-Date=20221230T103439Z&X-Amz-Expires=900&X-Amz-Signature=a05707ced1e329b712b3e620bc8e533eb38a3f779bcdeaf22df03af7effa7246&X-Amz-SignedHeaders=host",
        "file_uuid": "2c8ad2ff-5b90-4308-b3d8-29b5f661930f",
        "fileUploadRequestId": 65
    }
}
```

### [private] POST /storage/:bucket_uuid/file/:id/detail

> Gets details of specific file inside bucket

#### URL parameters

| Name         | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| :bucket_uuid | Unique key of bucket. Key is displayed in developer console. |
| :id          | File internal ID, UUID or CID                                |

#### Possible errors

| Code     | Description           |
| -------- | --------------------- |
| 40406005 | File does not exists. |

#### Response fields

Response `data` property contains two properties: `fileStatus` and `file`. File status tells us the current status of the file relative to the entire flow the file goes through to be fully loaded and pinned on CRUST, while `file` property holds file metadata fields.

##### File statuses

| Number | Description                                          |
| ------ | ---------------------------------------------------- |
| 1      | Request for upload to Apillon storage was generated. |
| 2      | File uploaded to AWS S3.                             |
| 3      | File transfered to IPFS node                         |
| 4      | File is pinned to CRUST                              |

##### File metadata

| Field                                                                    | Description                                                                |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| id                                                                       | `integer` Apillon internal file ID                                         |
| status                                                                   | `integer` Apillon internal file status                                     |
| file_uuid                                                                | `string` File unique identifier                                            |
| [CID](https://docs.ipfs.tech/concepts/content-addressing/#what-is-a-cid) | `string` File content identifier - label used to point to material in IPFS |
| name                                                                     | `string` File name                                                         |
| contentType                                                              | `string` File content type (Mime type)                                     |
| size                                                                     | `integer` Size in bytes                                                    |
| downloadLink                                                             | `string` File link on Apillon IPFS gateway                                 |

#### Request cURL example

```
curl --location --request GET "http://localhost:6002/storage/cee9f151-a371-495b-acd2-4362fbb780/file/44/detail" \
--header "Authorization: Basic MTJhMTVmNmYtMzc3NC00MTVjLWE0MzMtYWZlYjA5OWY3NjM4OjAxVE1IVjVIKlZoSg=="
```

#### Request response example

```JSON
{
    "id": "5be33c54-2cc9-46f4-8f50-debc98866810",
    "status": 200,
    "data": {
        "fileStatus": 4,
        "file": {
            "id": 44,
            "status": 5,
            "file_uuid": "e6be1ae3-1b57-47e5-a30c-d9c7772c9739",
            "CID": "QmUL7wDowvNk3y7KeEYFAATmz43727FwXKhBJJrqQu813a",
            "name": "apillon api file 1.txt",
            "contentType": "text/plain",
            "size": 11,
            "fileStatus": 4,
            "downloadLink": "https://ipfs.apillon.io/ipfs/QmUL7wDowvNk3y7KeEYFAATmz43727FwXKhBJJrqQu813a"
        }
    }
}
```
