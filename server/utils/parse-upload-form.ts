import formidable from 'formidable';
import { join } from 'node:path';
import type { H3Event } from 'h3';

// Sets up formidable, parses a multipart upload request, and normalizes its
// error handling. Shared by both server/api/upload.post.ts and
// server/api/reverse/[uploadToken].post.ts, since both need identical
// formidable setup and identical maxFileSize error handling.
export const parseUploadForm = async (event: H3Event, maxFileSize: number) => {
  const req = event.node.req;

  const form = formidable({
    uploadDir: join(process.cwd(), "uploads"),
    maxFileSize,
    // maxTotalFileSize defaults to maxFileSize if left unset, which wrongly
    // caps the *sum* of all files in a multi-file upload at the per-file
    // limit. maxFileSize is meant to be a per-file cap, so disable the
    // total cap and let maxFileSize do the enforcement per file instead.
    maxTotalFileSize: Infinity,
    multiples: true
  });

  // formidable's multipart parser emits an 'error' event on the form
  // itself when a size limit is exceeded. If nothing is listening for it,
  // Node treats it as an uncaught error and dumps a raw stack trace to
  // the console instead of just rejecting form.parse()'s promise. This
  // no-op listener ensures the error only ever surfaces through the
  // catch block below, as a clean response to the client.
  form.on('error', () => {})

  try {
    return await form.parse(req);
  } catch (err) {
    console.error(err);

    if (err instanceof Error && /maxFileSize|maxTotalFileSize/i.test(err.message)) {
		throw createError({
			statusCode: 400,
			message: `File exceeds the maximum allowed size of ${formatBytes(maxFileSize)}`
		})
  	}

	throw createError({
		statusCode: 400,
		message: "Failed to parse upload"
	})
  }
}
