UPDATE transaction_queue AS tq
	SET tq.project_uuid  =
      CASE
        WHEN tq.referenceTable = 'file' THEN (
          SELECT f.project_uuid
          FROM ${StorageDB}.file AS f
          WHERE f.file_uuid = tq.referenceId
          LIMIT 1
        )
        WHEN tq.referenceTable = 'collection' THEN (
          SELECT c.project_uuid
          FROM ${NftsDB}.collection AS c
          WHERE c.id = tq.referenceId
          LIMIT 1
        )
        WHEN tq.referenceTable = 'directory' THEN (
          SELECT d.project_uuid
          FROM ${StorageDB}.directory AS d
          WHERE d.directory_uuid = tq.referenceId
          LIMIT 1
        )
        WHEN tq.referenceTable = 'bucket' THEN (
          SELECT b.project_uuid
          FROM ${StorageDB}.bucket AS b
          WHERE b.bucket_uuid = tq.referenceId
        )
        ELSE NULL
      END;