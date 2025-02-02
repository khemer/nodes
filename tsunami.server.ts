const apiUrl = process.env.APP_API_URL;

export const graph = async (data: any) => {

  try {
    const response = await fetch(apiUrl as string, {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer "+process.env.APP_LOCAL_TOKEN
      },
      body: JSON.stringify(data)
    });

    if (response.ok) {
      return response;
    } else {
      throw new Error("unable to connect to the server.")
    }
  } catch(error) {
    console.log(JSON.stringify(error))
    throw new Response("unable to connect to the server.")
  }
  
};

// let localSessionData: any = [];
let apiSessionData: any = [];

const apiSession = async (request: Request, force: boolean = false, unauthenticated: any = null) => {
  const shop = unauthenticated.shop;
  
  if(apiSessionData[shop]?.id && !force){
    return apiSessionData[shop];
  }else{
    if(shop){
      const {
        data: {
          merchant
        }
      } = await(await graph({
        query: `
          query GET_MERCHANT($shop: String!) {
            merchant(trashed: WITH, shop: $shop) {
              attributes {
                id
                name
                value
              }
              email
              id
              name
              shop
              deleted_at
            }
          }
        `,
        variables: {
          shop: shop
        }
      })).json();

      let attrs:any = [];
      if(merchant?.id){
        merchant?.attributes.forEach((attr: { name: string; }) => {
          attrs[attr.name] = attr;
        });
        merchant.attributes = attrs;
        apiSessionData[shop] = merchant;
      }
    }

    return apiSessionData[shop];
  }

}

export const session = {
  apiSession: apiSession
}



