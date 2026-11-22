import type { CreateTweetBody, PresignUploadBody } from '@chirp/shared';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';

import { apiError } from '@/test/msw/errors';
import { tweetCreated } from '@/test/msw/handlers';
import { server } from '@/test/msw/server';
import { renderRoute } from '@/test/render';

const UPLOAD_URL = 'http://storage.test/chirp-media/users/me/tweet/abc.png';
const KEY = 'users/me/tweet/abc.png';

/** The bucket's CORS answer for the web origin, as `storage-init` configures it. */
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'PUT',
  'Access-Control-Allow-Headers': 'content-type',
};

const png = (bytes = 8) => new File([new Uint8Array(bytes)], 'photo.png', { type: 'image/png' });

/** A response the test releases when it is ready, to look at the UI while a request is open. */
function gate() {
  let release: () => void = () => {};
  const opened = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { opened, release };
}

/** Presign and storage as they behave for real; `put` can delay or fail the upload. */
function storageAccepts({
  onPresign = () => {},
  put = () => new HttpResponse(null, { status: 200, headers: CORS_HEADERS }),
}: {
  onPresign?: (body: PresignUploadBody) => void;
  put?: () => Response | Promise<Response>;
} = {}) {
  server.use(
    http.post('/api/uploads/presign', async ({ request }) => {
      onPresign((await request.json()) as PresignUploadBody);
      return HttpResponse.json({ uploadUrl: UPLOAD_URL, key: KEY });
    }),
    // The upload is cross-origin, so the browser asks the bucket first (CORS preflight).
    http.options(UPLOAD_URL, () => new HttpResponse(null, { status: 204, headers: CORS_HEADERS })),
    http.put(UPLOAD_URL, put),
  );
}

async function renderComposer(options: Parameters<typeof userEvent.setup>[0] = {}) {
  const user = userEvent.setup(options);
  renderRoute('/home');
  await screen.findByRole('heading', { level: 1, name: 'Home' });
  const textbox = screen.getByRole('textbox', { name: 'What’s happening?' });
  const form = textbox.closest('form');
  if (!form) throw new Error('The composer has no form');
  const composer = within(form);
  return {
    user,
    textbox,
    composer,
    fileInput: composer.getByLabelText('Image file'),
    submit: composer.getByRole('button', { name: 'Chirp' }),
  };
}

describe('Composer images', () => {
  it('uploads a picked image, previews it and posts it with the chirp', async () => {
    const presigned: PresignUploadBody[] = [];
    const posted: CreateTweetBody[] = [];
    storageAccepts({ onPresign: (body) => presigned.push(body) });
    server.use(tweetCreated((body) => posted.push(body)));
    const { user, textbox, composer, fileInput, submit } = await renderComposer();

    await user.upload(fileInput, png(8));

    expect(composer.getByRole('img', { name: 'Image to attach' })).toBeInTheDocument();
    expect(presigned).toEqual([{ purpose: 'tweet', contentType: 'image/png', size: 8 }]);
    await waitFor(() => {
      expect(composer.queryByRole('progressbar')).not.toBeInTheDocument();
    });
    await user.type(textbox, 'Sunset');
    await user.click(submit);

    expect(await screen.findByText('Your chirp is posted')).toBeInTheDocument();
    expect(posted).toEqual([{ content: 'Sunset', imageKey: KEY }]);
    expect(composer.queryByRole('img', { name: 'Image to attach' })).not.toBeInTheDocument();
    expect(composer.getByRole('button', { name: 'Add image' })).toBeEnabled();
  });

  it('holds the chirp back while the image is still uploading', async () => {
    const upload = gate();
    storageAccepts({
      put: async () => {
        await upload.opened;
        return new HttpResponse(null, { status: 200, headers: CORS_HEADERS });
      },
    });
    const { user, textbox, composer, fileInput, submit } = await renderComposer();
    await user.type(textbox, 'Wait for it');

    await user.upload(fileInput, png());

    expect(
      await composer.findByRole('progressbar', { name: 'Uploading image' }),
    ).toBeInTheDocument();
    expect(submit).toBeDisabled();
    expect(composer.getByRole('button', { name: 'Add image' })).toBeDisabled();

    upload.release();

    await waitFor(() => {
      expect(submit).toBeEnabled();
    });
  });

  it('posts without the image once it is removed', async () => {
    const posted: CreateTweetBody[] = [];
    storageAccepts();
    server.use(tweetCreated((body) => posted.push(body)));
    const { user, textbox, composer, fileInput, submit } = await renderComposer();
    await user.upload(fileInput, png());

    await user.click(composer.getByRole('button', { name: 'Remove image' }));
    await user.type(textbox, 'Words only');
    await user.click(submit);

    await screen.findByText('Your chirp is posted');
    expect(posted).toEqual([{ content: 'Words only' }]);
  });

  it('refuses a file type the API would refuse, without asking it', async () => {
    const presigned: PresignUploadBody[] = [];
    storageAccepts({ onPresign: (body) => presigned.push(body) });
    // The picker's `accept` filters types in browsers; drag-and-drop and some pickers do not.
    const { user, composer, fileInput } = await renderComposer({ applyAccept: false });

    await user.upload(fileInput, new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' }));

    expect(composer.getByRole('alert')).toHaveTextContent('Use a JPEG, PNG, WebP or GIF image');
    expect(presigned).toEqual([]);

    await user.click(composer.getByRole('button', { name: 'Dismiss' }));

    expect(composer.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('refuses an image over 5 MB before uploading it', async () => {
    const presigned: PresignUploadBody[] = [];
    storageAccepts({ onPresign: (body) => presigned.push(body) });
    const { user, composer, fileInput } = await renderComposer();

    await user.upload(fileInput, png(5 * 1024 * 1024 + 1));

    expect(composer.getByRole('alert')).toHaveTextContent('Use an image of at most 5 MB');
    expect(presigned).toEqual([]);
  });

  it('explains a failed upload and keeps the chirp unpostable until the image is removed', async () => {
    storageAccepts({ put: () => new HttpResponse(null, { status: 403, headers: CORS_HEADERS }) });
    const { user, textbox, composer, fileInput, submit } = await renderComposer();
    await user.type(textbox, 'Broken pic');

    await user.upload(fileInput, png());

    expect(await composer.findByRole('alert')).toHaveTextContent('The image didn’t upload.');
    expect(submit).toBeDisabled();

    await user.click(composer.getByRole('button', { name: 'Remove image' }));

    expect(submit).toBeEnabled();
  });

  it('shows the API’s reason when it refuses to presign', async () => {
    server.use(
      http.post('/api/uploads/presign', () =>
        apiError(400, 'VALIDATION_ERROR', 'Use an image of at most 2 MB'),
      ),
    );
    const { user, composer, fileInput } = await renderComposer();

    await user.upload(fileInput, png());

    expect(await composer.findByRole('alert')).toHaveTextContent('Use an image of at most 2 MB');
  });

  it('shows the API’s reason when it refuses the attached image', async () => {
    storageAccepts();
    server.use(
      http.post('/api/tweets', () =>
        apiError(400, 'VALIDATION_ERROR', 'This image can’t be used. Upload it again.', {
          imageKey: ['This image can’t be used. Upload it again.'],
        }),
      ),
    );
    const { user, textbox, composer, fileInput, submit } = await renderComposer();
    await user.upload(fileInput, png());
    await waitFor(() => {
      expect(submit).toBeDisabled();
    });
    await user.type(textbox, 'Try');

    await user.click(submit);

    expect(
      await composer.findByText('This image can’t be used. Upload it again.'),
    ).toBeInTheDocument();
  });
});
