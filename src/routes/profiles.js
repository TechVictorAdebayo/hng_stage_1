const axios = require('axios')
const express = require ('express');
const router = express.Router();
const prisma = require('../prismaClient');
const {uuidv7} = require ('uuidv7');
const {authenticate, authorize} = require('../middleware/auth')

const countryMap = {}

async function buildCountryMap (){

    try{
        const  countries = await prisma.profile.findMany({
        select: {
            country_name: true,
            country_id: true
        },
        distinct: ['country_id']
    })
    for (const country of countries){
    countryMap[country.country_name.toLowerCase()] = country.country_id
}
console.log('Country Map built successfully');

    }catch(error){
        console.log('Failed to build country map:', error.message);
        
    }
    

}


buildCountryMap()

function parseQuery(q){
    const query = q.toLowerCase()
    const filters = {}

    if (query.includes('male and female') || query.includes('female and male')){

    }else if (query.includes('male') || query.includes('males') || 
        query.includes('man') || query.includes('men') ||
        query.includes('boy') || query.includes('boys')){
        filters.gender = 'male'
    }else if (query.includes('female') || query.includes('females') || 
        query.includes('woman') || query.includes('women') ||
        query.includes('lady') || query.includes('ladies') ||
        query.includes('girl') || query.includes('girls')){
        filters.gender = 'female'
    }

    if (query.includes('young') || query.includes('youth')){
        filters.min_age = 16
        filters.max_age = 24
    }else if (query.includes('child') || query.includes('children') ||
        query.includes('kid') || query.includes('kids')){
            filters.age_group = "child"
        }
    else if (query.includes('teenager') || query.includes('teenagers') || 
        query.includes('teen')  || query.includes('teens') || query.includes('adolescent') ){
            filters.age_group = "teenager"
        }
    else if (query.includes('adult') || query.includes('adults') ){
        filters.age_group = "adult"
    }
    else if(query.includes('senior') || query.includes('seniors')  ||
         query.includes('elderly')  || query.includes('old') ){
        filters.age_group = "senior"
    }

    const aboveMatch = query.match(/(?:above|over|older than)\s+(\d+)/)
    if (aboveMatch) filters.min_age = parseInt(aboveMatch[1])

    const belowMatch = query.match(/(?:below|under|younger than)\s+(\d+)/)
    if (belowMatch) filters.max_age = parseInt(belowMatch[1])

    for (const [countryName, code] of Object.entries(countryMap)){
        if (query.includes(countryName)){
            filters.country_id = code
            break
        }
    }

    return filters
}


router.post('/', authenticate, authorize('admin'), async(req, res) => {
    const {name} = req.body


    if (name === undefined){
        return res.status(400).json({
            "status": "error",
            "message": "Name is a required field"
        })
    
    }

    if (typeof(name) !== 'string'){
        return res.status(422).json({
            "status": "error",
            "message": "Name must be a string"
        })
    }

    if (name.trim() === ""){
        return res.status(400).json({
            "status": "error",
            "message": "Please provide your name"
        })

    }

    const normalizedName = name.trim().toLowerCase()

     

    try{

        const existingProfile = await prisma.profile.findUnique({
        where: {name: normalizedName}
        
    });

    if (existingProfile !== null){
        return res.status(200).json({
            "status": "success",
            "message": "Profile already exists",
            "data": existingProfile
        })

    }

        const [genderRes, ageRes, nationalityRes] = await Promise.all([
        axios.get(`https://api.genderize.io?name=${normalizedName}`),
        axios.get(`https://api.agify.io/?name=${normalizedName}`),
        axios.get(`https://api.nationalize.io/?name=${normalizedName}`)

    ])

    const {gender, probability: gender_probability, count: sample_size} = genderRes.data
    const {age} = ageRes.data
   

    

    if (gender === null || sample_size === 0){
        return res.status(502).json({
            "status": "error",
            "message": "Genderize returned an invalid response"
        })
    }

    if (age === null){
        return res.status(502).json({
            "status": "error",
            "message": "Agify returned an invalid response"
        })
        }

    if (!nationalityRes.data.country ||nationalityRes.data.country.length === 0){
        return res.status(502).json({
            "status": "error",
            "message": "Nationalize returned an invalid response"
        })
        }

    const topCountry = nationalityRes.data.country.reduce((max, current) => {
    return current.probability > max.probability ? current : max;
        });

    const country_id = topCountry.country_id;
    const country_probability = topCountry.probability;
        
    
    const age_group = age <= 12 ? "child" : 
                    age <= 19 ? "teenager" :  
                    age <= 59 ? "adult": "senior"
    
    const newProfile = await prisma.profile.create({
        data: {
            id: uuidv7(),
            name: normalizedName,
            gender: gender,
            gender_probability: gender_probability,
            age: age,
            age_group: age_group,
            country_id: country_id,
            country_name: country_id,
            country_probability: country_probability            }
        }) 
        return res.status(201).json({
            "status": "success",
            "data": newProfile
        });

   
  
    }catch(error){
        console.log(error);

        return res.status(500).json({
            "status": "error",
            "message": "Internal Server Error"
        })

    }

    
        
})

router.get('/', authenticate, async(req, res) => {
    const {gender, country_id, age_group,
        min_age, max_age,
        min_gender_probability, min_country_probability,
        sort_by, order, page, limit
    } =req.query

    // Validation
    const validSortFields = ['age', 'created_at', 'gender_probability']
    const validOrders = ['asc', 'desc']

    if (sort_by && !validSortFields.includes(sort_by)){
        return res.status(422).json({
            "status": "error",
            "message": "Invalid query parameters"
        })
    }

    if (order &&  !validOrders.includes(order.toLowerCase())){
        return res.status(422).json({
            "status": "error",
            "message": "Invalid query parameters"
        })
    }

    if (min_age && isNaN(Number(min_age))){
        return res.status(422).json({
            "status": "error",
            "message": "Invalid query parameters"
        })
    }

    if (max_age && isNaN(Number(max_age))){
        return res.status(422).json({
            "status": "error",
            "message": "Invalid query paramaters"
        })
    }

    if (min_gender_probability && isNaN(Number(min_gender_probability))){
        return res.status(422).json({
            "status": "error",
            "message": "Invalid query parameters"
        })
    }

    if (min_country_probability && isNaN(Number(min_country_probability))){
        return res.status(422).json({
            "status": "error",
            "message": "Invalid query parameters"
        })
    }

    //Building the Where Clause

    const where = {}
    if (gender) where.gender = gender.toLowerCase()
    if (country_id) where.country_id = country_id.toUpperCase()
    if (age_group) where.age_group = age_group.toLowerCase()

    if (min_age || max_age){
        where.age = {}
        if (min_age) where.age.gte = Number(min_age)
        if (max_age) where.age.lte = Number (max_age)
    }


    if (min_gender_probability) {
        where.gender_probability = {gte: Number(min_gender_probability)}
    }

    if (min_country_probability){
        where.country_probability = {gte: Number(min_country_probability)}
    }

    //Pagination
    
    const pageNum = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(50, Math.max(1, parseInt(limit) || 10))
    const skip = (pageNum - 1) * limitNum

    // Sorting

    const orderBy = sort_by
        ? {[sort_by]: (order || 'asc').toLowerCase()}
        : {created_at: 'asc'}

    try{
        const [data, count] = await Promise.all([
            prisma.profile.findMany({where, orderBy, skip, take: limitNum}),
            prisma.profile.count({where})
        ])

        const total_pages = Math.ceil( count / limitNum)
        
        return res.status(200).json({
            status: "success",
            page: pageNum,
            limit: limitNum,
            total: count,
            total_pages,
            links: {
                self: `/api/profiles?page=${pageNum}&limit=${limitNum}`,
                next: pageNum < total_pages
                ? `/api/profiles?page=${pageNum + 1}&limit=${limitNum}`
                : null,
            prev: pageNum > 1
                ? `/api/profiles?page=${pageNum - 1}&limit=${limitNum}`
                : null    
            },
            data
        })
    }catch(error){
        console.log(error);
        return res.status(500).json({
            "status": "error",
            "message": "Internal Server Error"
        })
    }
})

router.get('/search', authenticate, async (req, res) =>{
    const {q, page, limit} = req.query

    if (!q || q.trim() === ''){
        return res.status(400).json({
            "status": "error",
            "message": "Invalid query parameters"
        })
    }

    const filters = parseQuery(q)

    if (filters.min_age || filters.max_age){
        filters.age = {}

        if (filters.min_age) filters.age.gte = filters.min_age
        if (filters.max_age) filters.age.lte = filters.max_age
        delete filters.min_age
        delete filters.max_age
    }

    if (Object.keys(filters).length === 0){
        return res.status(400).json({
            "status": 'error',
            "message": "Unable to interpret query"
        })
    }

    const pageNum = parseInt(page) || 1
    const limitNum = Math.min(parseInt(limit) || 10, 50)
    const skip = (pageNum - 1) * limitNum

    try {
        const [profiles, total] = await Promise.all([
            prisma.profile.findMany({
                where: filters,
                skip,
                take: limitNum
            }),
            prisma.profile.count({where: filters})
        ])

        const total_pages = Math.ceil(total / limitNum)

        return res.status(200).json({
            "status": "success",
            "page": pageNum,
            "limit": limitNum,
            total,
            total_pages,
            links: {
                self: `/api/profiles/search?page=${pageNum}&limit=${limitNum}`,
                next: pageNum < total_pages
                ? `/api/profiles/search?page=${pageNum + 1}&limit=${limitNum}`
                : null,
            prev: pageNum > 1
                ? `/api/profiles/search?page=${pageNum - 1}&limit=${limitNum}`
                : null
            },
            "data": profiles

            
        })
    }catch(error){
        console.log(error);
        return res.status(500).json({
            "status": "error",
            "message": "Internal Server Error"
        })
        
    }
})

router.get('/export', authenticate, async(req, res) => {
    const {gender, country_id, age_group, min_age,
        min_gender_probability,max_age, min_country_probability, 
        sort_by, order
    } = req.query

    
    const where = {}
    if (gender) where.gender = gender.toLowerCase()
    if (country_id) where.country_id = country_id.toUpperCase()
    if (age_group) where.age_group = age_group.toLowerCase()

    if (min_age || max_age){
        where.age = {}
        if (min_age) where.age.gte = Number(min_age)
        if (max_age) where.age.lte = Number (max_age)
    }


    if (min_gender_probability) {
        where.gender_probability = {gte: Number(min_gender_probability)}
    }

    if (min_country_probability){
        where.country_probability = {gte: Number(min_country_probability)}
    }

    const orderBy = sort_by 
        ? {[sort_by]: (order || 'asc').toLowerCase()}
        : {created_at: 'asc'}

    try{
        const profiles = await prisma.profile.findMany({where, orderBy})

        let csv = 'id,name,gender,gender_probability,age,age_group,country_id,country_name,country_probability,created_at\n'

        for (const profile of profiles){
            csv += `${profile.id},${profile.name},${profile.gender},${profile.gender_probability},${profile.age},${profile.age_group},${profile.country_id},${profile.country_name},${profile.country_probability},${profile.created_at}\n`
        }

        const timestamp = Date.now()
        res.setHeader('Content-Type', 'text/csv')
        res.setHeader('Content-Disposition', `attachment; filename="profiles_${timestamp}.csv"`)
        res.send(csv)
    }catch(error){
        console.log(error);
        res.status(500).json({
            status: 'error',
            message: 'Internal Server error'
        })
        
    }

})




router.get('/:id', authenticate, async(req, res) =>{
    const id = req.params.id

    

    try{

        const profile = await prisma.profile.findUnique({
        where: {id: id}

        })

        if (profile){
        return res.status(200).json({
            "status": "success",
            "data": profile
        })
    

    }
    else{
        return res.status(404).json({
            "status": "error",
            "message": "Profile not found"
        })
    }
    }catch(error){
        console.log(error);
        return res.status(500).json({
            "status": "error",
            "message": "Internal Server Error"
        })
        
    }
})



router.delete('/:id', authenticate, authorize('admin'), async(req, res) => {
    const id = req.params.id
    if(!id){
        return res.status(400).json({
            "status": "error",
            "message": "Invalid Profile id"
        })
    }

    try{
        const existingProfile = await prisma.profile.findUnique({
            where: {id: id}
        });
        
        if (!existingProfile){
            return res.status(404).json({
                "status": "error",
                "message": "Profile not found"
            })
        }

        await prisma.profile.delete({
            where: {id}
        })

        return res.sendStatus(204)
    }catch(error){
        console.log(error);
        return res.status(500).json({
            "status": "error",
            "message": "Internal Server Error"
        })
    }
} )


module.exports = router;