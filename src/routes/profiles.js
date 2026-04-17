const axios = require('axios')
const express = require ('express');
const router = express.Router();
const prisma = require('../prismaClient');
const {uuidv7} = require ('uuidv7');


router.post('/', async(req, res) => {
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
            sample_size: sample_size,
            age: age,
            age_group: age_group,
            country_id: country_id,
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

router.get('/', async(req, res) => {
    const {gender, country_id, age_group} =req.query

    const where = {}
    if (gender) where.gender = gender.toLowerCase()
    if (country_id) where.country_id = country_id.toUpperCase()
    if (age_group) where.age_group = age_group.toLowerCase()
    try{
        const profiles = await prisma.profile.findMany({where})
        const count = profiles.length
        return res.status(200).json({
                "status": "success",
                 "count": count,
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

router.get('/:id', async(req, res) =>{
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



router.delete('/:id', async(req, res) => {
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