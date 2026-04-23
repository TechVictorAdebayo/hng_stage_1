# HNG Stage 2 — Intelligence Query Engine

A REST API that accepts a name, enriches it with gender, age, and nationality data from three external APIs, stores the result in a PostgreSQL database, and exposes endpoints to query and filter the data using advanced filters, sorting, pagination, and natural language search.

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
   ```
   git clone https://github.com/yourusername/hng-stage2.git
   cd hng-stage2
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```
   DATABASE_URL="your_pooled_connection_string"
   DIRECT_URL="your_direct_connection_string"
   ```

4. Push the database schema:
   ```
   npx prisma db push
   ```

5. Generate the Prisma client:
   ```
   npx prisma generate
   ```

6. Seed the database:
   ```
   npx prisma db seed
   ```

7. Start the development server:
   ```
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
    "age": 53,
    "age_group": "adult",
    "country_id": "CM",
    "country_name": "CM",
    "country_probability": 0.09,
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
    "age": 53,
    "age_group": "adult",
    "country_id": "CM",
    "country_name": "CM",
    "country_probability": 0.09,
    "created_at": "2026-04-17T12:51:56.395Z"
  }
}
```

---

### GET /api/profiles

Returns profiles with support for filtering, sorting, and pagination.

**Query Parameters (all optional):**


 gender | string | Filter by gender: `male` or `female` 
 age_group | string | Filter by age group: `child`, `teenager`, `adult`, `senior` 
 country_id | string | Filter by ISO country code e.g. `NG`, `KE` 
 min_age | number | Filter profiles with age greater than or equal to value 
 max_age | number | Filter profiles with age less than or equal to value 
 min_gender_probability | number | Filter by minimum gender confidence score 
 min_country_probability | number | Filter by minimum country confidence score 
 sort_by | string | Sort by: `age`, `created_at`, `gender_probability` 
 order | string | Sort order: `asc` or `desc` (default: `asc`) 
 page | number | Page number (default: `1`) 
 limit | number | Results per page (default: `10`, max: `50`) 

**Example Requests:**
```
GET /api/profiles?gender=male&country_id=NG&min_age=25
GET /api/profiles?sort_by=age&order=desc
GET /api/profiles?page=2&limit=20
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 2026,
  "data": [
    {
      "id": "019d9bc1-7269-7ec1-be3f-8f1ec2e6a78b",
      "name": "john",
      "gender": "male",
      "gender_probability": 1,
      "age": 75,
      "age_group": "senior",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.07,
      "created_at": "2026-04-17T14:03:59.470Z"
    }
  ]
}
```

---

### GET /api/profiles/search

Interprets a plain English query and returns matching profiles. Supports pagination.

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| q | string | Natural language search query (required) |
| page | number | Page number (default: `1`) |
| limit | number | Results per page (default: `10`, max: `50`) |

**Example Queries:**

| Query | Interpreted As |
|---|---|
| `young males from nigeria` | gender=male, min_age=16, max_age=24, country_id=NG |
| `females above 30` | gender=female, min_age=30 |
| `adult males from kenya` | gender=male, age_group=adult, country_id=KE |
| `male and female teenagers above 17` | age_group=teenager, min_age=17 |
| `seniors from tanzania` | age_group=senior, country_id=TZ |

**Example Request:**
```
GET /api/profiles/search?q=young males from nigeria&page=1&limit=10
```

**Success Response (200 OK):**
```json
{
  "status": "success",
  "page": 1,
  "limit": 10,
  "total": 45,
  "data": [
    {
      "id": "019d9bc1-7269-7ec1-be3f-8f1ec2e6a78b",
      "name": "emeka",
      "gender": "male",
      "gender_probability": 0.98,
      "age": 20,
      "age_group": "adult",
      "country_id": "NG",
      "country_name": "Nigeria",
      "country_probability": 0.91,
      "created_at": "2026-04-17T14:03:59.470Z"
    }
  ]
}
```

**Unable to Interpret Query (400):**
```json
{
  "status": "error",
  "message": "Unable to interpret query"
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
    "age": 75,
    "age_group": "senior",
    "country_id": "NG",
    "country_name": "Nigeria",
    "country_probability": 0.07,
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

| Status Code | Description |
|---|---|
| 400 | Missing or empty parameter |
| 422 | Invalid parameter type or value |
| 404 | Profile not found |
| 502 | External API returned invalid data |
| 500 | Internal server error |

---

## Natural Language Query Parsing

The `/search` endpoint uses rule-based parsing to interpret plain English queries. No AI or LLMs are used.

**Supported keywords:**

- **Gender**: male, males, man, men, boy, female, females, woman, women, lady, ladies, girl
- **Age groups**: child, children, kid, teenager, teen, adult, senior, elderly
- **Young/youth**: maps to age range 16–24
- **Age range**: "above X", "over X", "older than X", "below X", "under X", "younger than X"
- **Country**: full country name e.g. "nigeria", "kenya", "tanzania"

---

## External APIs Used

- [Genderize.io](https://genderize.io) — predicts gender from a name
- [Agify.io](https://agify.io) — predicts age from a name
- [Nationalize.io](https://nationalize.io) — predicts nationality from a name