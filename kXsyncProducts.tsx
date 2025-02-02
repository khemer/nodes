import { graph as kxgraph } from "./kx.server";
import { graph } from "./tsunami.server";

const getKxProducts = async () => {
    return await kxgraph({
        query: `query(
                $filter: Json!
        ) {
            core {
                products(
                    filter: $filter, page: 1, count: 500
                ) {
                    items {
                        id
                        name
                        base_product_id
                        productCode
                        retail_sku
                        parent_id
                        type
                        ref
                        supplier_artwork_guidelines {
                            url
                        }
                        ecommerce {
                            sales_description_long
                            item_stock_weight_strategy
                            weight
                            lead_time_days
                            lead_time
                        }
                        pricing_matrices {
                            items{
                                price_type
                                tiers{
                                    items{
                                        group_id
                                        quantity
                                        price
                                    }
                                } 
                            }
                        }
                        snapshots{
                            small
                            large 
                        }
                        images{
                            items{
                                name
                                urls{
                                    thumbnail
                                }
                            }
                        }
                        bespoke_image {
                            url
                        }
                        categories{
                            items{
                                catId
                            }
                        }
                        variants{
                            items{
                                name
                                sku
                                attribute_1{
                                    group_name
                                    attribute_name
                                }
                                attribute_2{
                                    group_name
                                    attribute_name
                                }
                            }
                        }
                        is_deleted
                        is_disabled
                        is_discontinued
                        has_error
                        date_created
                        last_modified
                        surface_areas {
                            items {
                                print_width
                                print_height
                            }   
                        }
                    }
                }
            }
        }`,
        variables: {
            filter: {category_id:738025,owner_company_ref_id:1006910}
        }
    });
}

const getCoreProduct = (kxid: string) => {
    return graph({
        query: `
        query MyQuery($value: Mixed = "") {
            products(
                hasAttributes: {column: NAME, AND: {column: VALUE, operator: EQ, value: $value}, operator: EQ, value: "kx_id"}
                first: 1
                where: {column: STATUS, operator: NEQ, value: "5"}
            ) {
                data {
                name
                image
                fulfillment_time
                description
                id
                lead_time
                lead_time_days
                print_size
                product_template
                production_time
                shipping_time
                sku
                status
                weight
                weight_strategy
                variants {
                    id
                    name
                    image
                    option1
                    option2
                    option3
                    sku
                    status
                }
                options {
                    option1
                    option2
                    option3
                    id
                }
                attributes {
                    name
                    value
                    id
                }
                prices {
                    id
                    price
                    qty
                    type
                    country
                    currency
                }
                last_modified: attribute(
                    where: {column: NAME, operator: EQ, value: "kx_last_modified"}
                ) {
                    value
                }
                }
            }
        }
        `,
        variables: {
            value: kxid
        }
    })
}

const doAdd = (kxProduct: any) => {
    let input:any = doInitials(kxProduct);
    console.log(JSON.stringify(input));
    return graph({
        query: `mutation MyMutation($input: CreateProductInput!) {
            createProduct(input: $input) {
                id
            }
        }`,
        variables: {
            input: input
        }
    });
}

const doDelete = (id: string) => {
    return graph({
        query: `mutation MyMutation($id: ID = "", $status: String = "5") {
            updateProduct(input: {id: $id, status: $status}) {
                id
            }
        }`,
        variables: {
            id: id,
            status: '5'
        }
    });
}

const doUpdate = (coreProduct: any, kxProduct:any) => {
    let input:any = doInitials(kxProduct,coreProduct);
    return graph({
        query: `mutation MyMutation($input: UpdateProductInput!) {
            updateProduct(input: $input) {
                id
            }
        }`,
        variables: {
            input: input
        }
    });
}

const doInitials = (kxProduct: any, coreProduct:any = {}) => {
    let lead_time = kxProduct.ecommerce.lead_time??0;
    let lead_time_days = kxProduct.ecommerce.lead_time_days??0;
    lead_time = String(lead_time);
    lead_time_days = String(lead_time_days);
    if(lead_time == ""){
        lead_time = "0";
    }
    if(lead_time_days == ""){
        lead_time_days = "0";
    }

    let variables:any = {
        "name":kxProduct.name,
        "sku":kxProduct.retail_sku??kxProduct.productCode,
        "lead_time":lead_time,
        "lead_time_days":lead_time_days,
        "image":kxProduct.bespoke_image.url,
        "description":kxProduct.ecommerce.sales_description_long,
        "status":"1",
        "supplier_id":"1",
        "created_from":"kx",
        "product_template":kxProduct.supplier_artwork_guidelines?.url??'',
        "production_time":(kxProduct.production_time??0)+"",
        "weight_strategy":'lbs'
    };

    if(variables.sku == ""){
        variables.sku = "no sku";
    }

    let weight = Number(kxProduct.ecommerce.weight) * 0.0022;
    weight = Math.round((weight + Number.EPSILON) * 100) / 100;
    variables.weight = weight;

    if(kxProduct.surface_areas.items.length){
        let print_width = Number(kxProduct.surface_areas.items[0].print_width) / 25.4;
        let print_height = Number(kxProduct.surface_areas.items[0].print_height) / 25.4;
        print_width = Math.round((print_width + Number.EPSILON) * 100) / 100;
        print_height = Math.round((print_height + Number.EPSILON) * 100) / 100;
        variables.print_size = print_width+"in X "+print_height+"in";
    }

    if(kxProduct.is_discontinued || kxProduct.has_error || kxProduct.is_disabled){
        //when product has error or discontinued on kornitX
        variables.status = "0";
        variables.error_message = 'The Product is either discontinued or has error in KornitX.';
    }else{
        variables.error_message = '';
    }

    if(kxProduct.type == "4224"){
        variables.type = 'blank';
    }else{
        //when configuration is invalid on kornitX
        variables.type = 'invalid';
        variables.status = "0";
        variables.error_message = 'The Product Configuration is not compatible.';
    }

    if(coreProduct.id){
        variables.id = coreProduct.id;
    }

    if(!coreProduct.id){
        variables.categories = {connect:[1]};
    }

    let attributes = [
        {"name":"kx_id","value":kxProduct.id+""},
        {"name":"kx_ref","value":kxProduct.ref+""},
        {"name":"kx_last_modified","value":kxProduct.last_modified},
        {"name":"kx_parent_id","value":kxProduct.parent_id+""},
        {"name":"kx_base_product_id","value":kxProduct.base_product_id+""},
        {"name":"kx_type","value":kxProduct.type+""}
    ];
    

    let prices:any[] = [];
    if(kxProduct.pricing_matrices?.items?.length){
        kxProduct.pricing_matrices.items.forEach((kxprice: any) => {
            if(kxprice.price_type == 3 && kxprice.tiers?.items?.length){
                let cost = Number(kxprice.tiers?.items[0].price);
                cost = Math.round((cost + Number.EPSILON) * 100) / 100;

                prices.push({
                    price: cost,
                    type: 'cost',
                    qty: 1,
                    currency: 'US Dollar',
                    country: 'US'
                });
            }

            if(kxprice.price_type == 4 && kxprice.tiers?.items?.length){
                let shipping = Number(kxprice.tiers?.items[0].price);
                shipping = Math.round((shipping + Number.EPSILON) * 100) / 100;

                prices.push({
                    price: shipping,
                    type: 'shipping',
                    qty: 1,
                    currency: 'US Dollar',
                    country: 'US'
                });
            }

            if(kxprice.price_type == 1 && kxprice.tiers?.items?.length){
                let shipping_add_cost = Number(kxprice.tiers?.items[0].price);
                shipping_add_cost = Math.round((shipping_add_cost + Number.EPSILON) * 100) / 100;

                prices.push({
                    price: shipping_add_cost,
                    type: 'shipping_add_cost',
                    qty: 1,
                    currency: 'US Dollar',
                    country: 'US'
                });
            }

        });
    }
    if(coreProduct.id){
        if(prices.length){
            let updatePrices:any[] = [];
            let createPrices:any[] = [];
            let deletePrices:string[] = [];
            prices.forEach((price: any) => {
                let hasPrice = false;
                coreProduct.prices.forEach((corePrice: any) => {
                    if(price.type == corePrice.type && price.currency == corePrice.currency && price.country == corePrice.country){
                        hasPrice = true;
                        if(price.price != corePrice.price){
                            updatePrices.push(
                                {"id":corePrice.id,"price":price.price}
                            )
                            attributes.push({"name":"price_update","value":"1"})
                        }
                    }
                })
                if(!hasPrice){
                    createPrices.push(price);
                }
            })
            coreProduct.prices.forEach((corePrice: any) => {
                let hasPrice = false;
                prices.forEach((price: any) => {
                    if(price.type == corePrice.type && price.currency == corePrice.currency && price.country == corePrice.country){
                        hasPrice = true;
                    }
                })
                if(!hasPrice){
                    deletePrices.push(corePrice.id);
                }
            })
            variables.prices = {
                update: [],
                create: [],
                delete: []
            }
            if(updatePrices.length){
                variables.prices.update = updatePrices;
            }
            if(createPrices.length){
                variables.prices.create = createPrices;
            }
            if(deletePrices.length){
                variables.prices.delete = deletePrices;
            }
        }
    }else{
        if(prices.length){
            variables.prices = {create:prices};
        }
    }

    

    let variants:any[] = [];
    let variant_options:any = {};
    if(kxProduct.variants?.items?.length){
        variant_options = {
            option1: kxProduct.variants?.items[0]?.attribute_1?.group_name??"",
            option2: kxProduct.variants?.items[0]?.attribute_2?.group_name??"",
            option3: ""
        }

        kxProduct.variants?.items.forEach((kxvariant: any) => {
            variants.push({
                sku: kxvariant.sku,
                image: kxProduct.bespoke_image.url,
                option1: kxvariant.attribute_1?.attribute_name??"",
                option2: kxvariant.attribute_2?.attribute_name??"",
                option3: "",
                status:"1"
            });
        })
    }
    if(coreProduct.id){
        if(variants.length){
            let updateVariants:any[] = [];
            let createVariants:any[] = [];
            let deleteVariants:string[] = [];

            variables.options = {update: {id: coreProduct.options.id, ...variant_options}}
            variants.forEach((variant: any) => {
                let hasVariant = false;
                coreProduct.variants.forEach((coreVariant: any) => {
                    if(variant.sku == coreVariant.sku ){
                        hasVariant = true;
                        updateVariants.push(
                            {id:coreVariant.id, ...variant}
                        )
                    }
                })
                if(!hasVariant){
                    createVariants.push(variant);
                }
            })
            coreProduct.variants.forEach((coreVariant: any) => {
                let hasVariant = false;
                variants.forEach((variant: any) => {
                    if(variant.sku == coreVariant.sku ){
                        hasVariant = true;
                    }
                })
                if(!hasVariant){
                    deleteVariants.push(coreVariant.id);
                }
            })
            variables.variants = {
                update: [],
                create: [],
                delete: []
            }
            if(updateVariants.length){
                variables.variants.update = updateVariants;
            }
            if(createVariants.length){
                variables.variants.create = createVariants;
            }
            if(deleteVariants.length){
                variables.variants.delete = deleteVariants;
            }
        }

    }else{
        if(variants.length){
            variables.options = {create: variant_options}
            variables.variants = {create:variants};
        }
    }

    if(coreProduct.id){
        let updateAttributes:any[] = [];
        let createAttributes:any[] = [];
        let deleteAttributes:string[] = [];
        attributes.forEach((attribute: any) => {
            let hasAttr = false;
            coreProduct.attributes.forEach((coreAttribute: any) => {
                if(attribute.name == coreAttribute.name){
                    hasAttr = true;
                    if(attribute.value != coreAttribute.value){
                        updateAttributes.push(
                            {"id":coreAttribute.id,"value":attribute.value}
                        )
                    }
                }
            })
            if(!hasAttr){
                createAttributes.push(attribute);
            }
        })
        coreProduct.attributes.forEach((coreAttribute: any) => {
            let hasAttr = false;
            attributes.forEach((attribute: any) => {
                if(attribute.name == coreAttribute.name){
                    hasAttr = true;
                }
            })
            if(!hasAttr){
                deleteAttributes.push(coreAttribute.id);
            }
        })
        variables.attributes = {
            update: [],
            create: [],
            delete: []
        }
        if(updateAttributes.length){
            variables.attributes.update = updateAttributes;
        }
        if(createAttributes.length){
            variables.attributes.create = createAttributes;
        }
        if(deleteAttributes.length){
            variables.attributes.delete = deleteAttributes;
        }
    }else{
        variables.attributes = {create:attributes};
    }

    return variables;
}

const restructureProduct = async (kxProduct:any) => {
    if(!kxProduct.id){ return; }
    const res = await (await getCoreProduct(kxProduct.id)).json();
    if(res.errors?.length){ return; }

    //do we need to add it?
    if(!res.data.products.data.length){
        //add it
        console.log('new product kxId: '+kxProduct.id);
        return doAdd(kxProduct);
    }

    const coreProduct = res.data.products.data[0];
    //do we need to update?
    if(kxProduct.last_modified == coreProduct.last_modified.value){ 
        console.log('no modification needed: '+coreProduct.id);
        return; 
    }

    //do we need to delete it?
    if(kxProduct.is_deleted){ 
        //delete it
        console.log('deleted product: '+coreProduct.id);
        return doDelete(coreProduct.id)
    }

    console.log('update product: '+coreProduct.id);
    return doUpdate(coreProduct,kxProduct)

}

export async function kXsyncProducts() {
    const unstructuredData = await (await getKxProducts()).json();
    if(!unstructuredData.data?.core?.products?.items.length){ return []; }

    const unstructuredProducts = unstructuredData.data?.core?.products?.items;
    for (let index = 0; index < unstructuredProducts.length; index++) {
        const product = unstructuredProducts[index];
        const data = await (await restructureProduct(product))?.json();
        if(data?.errors?.length){
            console.log(JSON.stringify(data.errors[0].message))
        }
    }
}

