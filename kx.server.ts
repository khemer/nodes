
const kxclientsecret = process?.env.KX_CLIENT_SECRET;
const kxclientid = process.env.KX_CLIENT_ID;
const kxauthurl = process.env.KX_AUTH_URL;
const kxgraphurl = process.env.KX_GRAPHQL_URL;
const kxgranttype = process.env.KX_GRANT_TYPE;
const kxscope = process.env.KX_SCOPE;

export const graph = async (data: any) => {
  const kxtoken = await getToken();
  try {
    const response = await fetch(kxgraphurl as string, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer "+kxtoken
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      return response;
    } else {
      throw new Error("unable to connect to the server1.")
    }
  } catch(error) {
    console.log(JSON.stringify(error))
    throw new Response("unable to connect to the server2.")
  }
  
};

const getToken = async () => {
  const formData = new FormData();
  formData.append('grant_type', kxgranttype as string)
  formData.append('scope', kxscope as string)
  formData.append('client_id', kxclientid as string)
  formData.append('client_secret', kxclientsecret as string)

  const {access_token} = await(await fetch(kxauthurl as string, {
    method: 'POST',
    body: formData
  })).json();

  return access_token;
}