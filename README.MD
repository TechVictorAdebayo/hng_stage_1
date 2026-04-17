# HNG Stage 1 — Name Intelligence API

A REST API that accepts a name, enriches it with gender, age, and nationality data from three external APIs, stores the result in a PostgreSQL database, and exposes endpoints to manage the data.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: PostgreSQL (hosted on Neon)
- **ORM**: Prisma
- **Deployment**: Railway

## Getting Started

### Prerequisites

- Node.js v18+
- A PostgreSQL database (e.g. [Neon](https://neon.tech))

### Installation

1. Clone the repository:
  
   git clone https://github.com/yourusername/hng-stage1.git
   cd hng-stage1
   ```

2. Install dependencies:
   
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   DATABASE_URL="your_postgresql_connection_string"
   ```

4. Push the database schema:
   ```
   npx prisma db push
   ```

5. Generate the Prisma client:
   
   npx prisma generate
   ```

6. Start the development server:
   `
   npm run dev
   ```

The server will start on `http://localhost:3000`.

---

## API Endpoints

### POST /api/profiles

Creates a new profile by enriching the provided name with data from Genderize, Agify, and Nationalize APIs.

If a profile with the same name already exists, the existing profile is returned without calling the external APIs again.

**Request Body:**
```json
{
  "name": "ella"
}
```

**Success Response (201 Created):**
```json
{
  "status": "success",
  "data": {
    "id": "019d9b7f-71c7-7c5a-b2fa-ad797b91f428",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 97517,
    "age": 53,
    "age_group": "adult",
    "country_id": "CM",
    "country_probability": 0.09677289106552395,
    "created_at": "2026-04-17T12:51:56.395Z"
  }
}
```

**Profile Already Exists (200 OK):**
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": {
    "id": "019d9b7f-71c7-7c5a-b2fa-ad797b91f428",
    "name": "ella",
    "gender": "female",
    "gender_probability": 0.99,
    "sample_size": 97517,
    "age": 53,
    "age_group": "adult",
    "country_id": "CM",
    "country_probability": 0.09677289106552395,
    "created_at": "2026-04-17T12:51:56.395Z"
  }
}
```

---

### GET /api/profiles

Returns all profiles. Supports optional filtering via query parameters.

**Query Parameters (all optional):**


**Example Request:**
```
GET /api/profiles?gender=male&country_id=NG
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "019d9bc1-7269-7ec1-be3f-8f1ec2e6a78b",
      "name": "john",
      "gender": "male",
      "gender_probability": 1,
      "sample_size": 2692560,
      "age": 75,
      "age_group": "senior",
      "country_id": "NG",
      "country_probability": 0.07613817567167579,
      "created_at": "2026-04-17T14:03:59.470Z"
    },
    {
      "id": "019d9c03-441c-770a-be8e-ae1ea7ad53b4",
      "name": "victor",
      "gender": "male",
      "gender_probability": 1,
      "sample_size": 914605,
      "age": 60,
      "age_group": "senior",
      "country_id": "NG",
      "country_probability": 0.100027619745659,
      "created_at": "2026-04-17T15:15:53.001Z"
    }
  ]
}
```

---

### GET /api/profiles/:id

Returns a single profile by its ID.

**Example Request:**
```
GET /api/profiles/019d9bc1-7269-7ec1-be3f-8f1ec2e6a78b
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "data": {
    "id": "019d9bc1-7269-7ec1-be3f-8f1ec2e6a78b",
    "name": "john",
    "gender": "male",
    "gender_probability": 1,
    "sample_size": 2692560,
    "age": 75,
    "age_group": "senior",
    "country_id": "NG",
    "country_probability": 0.07613817567167579,
    "created_at": "2026-04-17T14:03:59.470Z"
  }
}
```

**Not Found (404):**
```json
{
  "status": "error",
  "message": "Profile not found"
}
```

---

### DELETE /api/profiles/:id

Deletes a profile by its ID.

**Example Request:**
```
DELETE /api/profiles/019d9bc1-7269-7ec1-be3f-8f1ec2e6a78b
```

**Success Response:** `204 No Content`

**Not Found (404):**
```json
{
  "status": "error",
  "message": "Profile not found"
}
```

---

## Error Responses

All errors follow this structure:

```json
{
  "status": "error",
  "message": "<error message>"
}
```

 Status Code 

| 400  Missing or empty name 
| 422  Name is not a string 
| 404  Profile not found 
| 502  External API returned invalid data 
| 500  Internal server error 

---



**Nationality:** The country with the highest probability from the Nationalize API response is selected.

---

## External APIs Used

- [Genderize.io](https://genderize.io) — predicts gender from a name
- [Agify.io](https://agify.io) — predicts age from a name
- [Nationalize.io](https://nationalize.io) — predicts nationality from a name