export default {
  async fetch(request, env) {
    const USERNAME = env.USERNAME;
    const PASSWORD = env.PASSWORD;
    const UPDATE_METHOD = 'POST';
    const LOCK_METHOD = 'LOCK';
    const UNLOCK_METHOD = 'UNLOCK';
    const STATE_NAMESPACE = env.KV_NAMESPACE;
    const STATE_KEY_PREFIX = 'state::';
    const LOCK_KEY_PREFIX = 'lock::';

    try {
      {
        const expectedToken = btoa([USERNAME, PASSWORD].join(':'));
        let authError = await authenticate(request, expectedToken);
        if (authError) return authError;
      }

      let requestURL = new URL(request.url);
      const path = requestURL.pathname;
      switch (true) {
        case request.method === 'GET':
          return await getState(path, STATE_NAMESPACE, STATE_KEY_PREFIX);
        case request.method === UPDATE_METHOD:
          return await setState(path, await request.text(), STATE_NAMESPACE, STATE_KEY_PREFIX);
        case request.method === 'DELETE':
          return await deleteState(path, STATE_NAMESPACE, STATE_KEY_PREFIX);
        case request.method === LOCK_METHOD:
          console.log(LOCK_KEY_PREFIX);
          return await lockState(
            path.substring(0, path.length),
            await request.text(),
            STATE_NAMESPACE,
            LOCK_KEY_PREFIX,
          );
        case request.method === UNLOCK_METHOD:
          return await unlockState(
            path.substring(0, path.length),
            await request.text(),
            STATE_NAMESPACE,
            LOCK_KEY_PREFIX,
          );
      }
      return new Response('Nothing found at ' + requestURL.pathname, {
        status: 404,
      });
    } catch (error) {
      return new Response(error.stack, { status: 500 });
    }
  }
}

async function authenticate(request, expectedToken) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || typeof authHeader !== 'string') {
    return new Response('Missing credentials', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Terraform State"',
      },
    });
  }

  const [scheme, credentials, ...rest] = authHeader.split(' ');
  if (rest.length != 0 || scheme !== 'Basic' || credentials !== expectedToken) {
    return new Response('Invalid credentials', {
      status: 403,
      headers: {
        'WWW-Authenticate': 'Basic realm="Terraform State"',
      },
    });
  }

  return void 0;
}

async function getState(path, STATE_NAMESPACE, STATE_KEY_PREFIX) {
  const state = await STATE_NAMESPACE.get(STATE_KEY_PREFIX + path);
  if (!state) {
    return new Response('Nothing found at ' + path, {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  return new Response(state || '', {
    headers: {
      'Content-type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
async function setState(path, body, STATE_NAMESPACE, STATE_KEY_PREFIX) {
  await STATE_NAMESPACE.put(STATE_KEY_PREFIX + path, body);
  return new Response(body || '', {
    status: 200,
    headers: {
      'Content-type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
async function deleteState(path, STATE_NAMESPACE, STATE_KEY_PREFIX) {
  await STATE_NAMESPACE.delete(STATE_KEY_PREFIX + path);
  return new Response('', {
    status: 200,
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}

async function lockState(path, body, STATE_NAMESPACE, LOCK_KEY_PREFIX) {
  const existingLock = await STATE_NAMESPACE.get(LOCK_KEY_PREFIX + path);
  if (existingLock) {
    return new Response(existingLock, {
      status: 409,
      headers: {
        'Content-type': 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  }
  await STATE_NAMESPACE.put(LOCK_KEY_PREFIX + path, body);
  return new Response(body, {
    headers: {
      'Content-type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

async function unlockState(path, body, STATE_NAMESPACE, LOCK_KEY_PREFIX,) {
  await STATE_NAMESPACE.delete(LOCK_KEY_PREFIX + path);
  return new Response('', {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}