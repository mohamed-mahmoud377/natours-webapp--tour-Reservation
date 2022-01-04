class APIFeatures{
    constructor(query,queryString) {
        this.query = query;
        this.queryString = queryString; // it is an object not string

    }
    filter(){

        const queryObj = {...this.queryString}; // to make a hard copy out for it ... taking all the values out and the {} making a new object out of it
        const excludedFields = ["page", 'sort', 'limit', 'fields'];
        excludedFields.forEach(el => delete queryObj[el]);

        //advanced filtering
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`); // fucking regular expressing must study one day :(

        this.query= this.query.find(JSON.parse(queryStr));



        return this;
    }

    sort(){
        if (this.queryString.sort) {
            // const sortedCriteria = this.queryString.sort.replace(",",' ');
            let sortedCriteria = this.queryString.sort.split(',').join(" ") // jonas approach

            console.log(sortedCriteria);
            this.query = this.query.sort(sortedCriteria);
            //sort(price rating) // this how mongoose does it to sort by more than one item

        } else {
            //getting sorted by default by the lastest one created
            this.query = this.query.sort("-createdAt");
        }
        return this;
    }

    limitFields(){
        if (this.queryString.fields) {
            // const fields = this.queryString.fields.replace(',', " "); does not work i dont know why
            let fields = this.queryString.fields.split(',').join(" ") // jonas approach

            console.log(fields);
            this.query = this.query.select(fields);
        } else {
            this.query = this.query.select("-__v");
        }
        return this;

    }
    paginate () {
        const page =this.queryString.page *1 || 1;  //pages that user provide *1 is for converting string to integer || for when page is actually null so it will take 1 as a default value
        const limit =this.queryString.limit *1 ||100;  // this the limit of how many docs this page has
        const skip = (page-1) * limit;  // in mongoose, we say we wanna skip som docs we don't give pages so this is how we get how many docs to skip based on the page and limit

        // the default is the first 100 doc
        this.query = this.query.skip(skip).limit(limit);

        // not necessary error
        // if (this.queryString.page){  // when you're trying to get docs from a page that does not exist will throw an error
        //     const numTours = await Tour.countDocuments();
        //     if (skip>=numTours) throw new Error("this page does not exist");
        // }


        return this;

    }

}

module.exports = APIFeatures;