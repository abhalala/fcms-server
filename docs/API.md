# FCMS Server API Documentation

Complete API reference for the Four Cubes Management System backend.

## Base URL

```
http://localhost:3000/api
```

Replace `localhost:3000` with your deployed server address.

## Authentication

Currently, the API does not require authentication. **Note:** Consider implementing authentication for production use.

## Response Format

All responses are in JSON format with appropriate HTTP status codes.

### Success Response
```json
{
  "data": { ... },
  "status": 200
}
```

### Error Response
```json
{
  "error": "Error message",
  "details": "Additional error information"
}
```

## Endpoints

---

## Health Check

### Check Server Status

```http
GET /api
```

#### Response
```json
{
  "status": 200
}
```

---

## Bundle Management

### Get Current Bundle Number

Retrieve the current bundle number counter value.

```http
GET /api/bundle/current-number
```

#### Response
```json
{
  "currentNumber": "123"
}
```

---

### Set Bundle Number

Update the bundle number counter.

```http
POST /api/bundle/set-number
```

#### Request Body
```json
{
  "number": "150"
}
```

#### Response
```json
{
  "success": true,
  "newNumber": "150"
}
```

#### Error Responses
- `400` - Invalid bundle number

---

### Create New Bundle

Create a new bundle in the system.

```http
POST /api/bundle/create
```

#### Request Body
```json
{
  "cutlength": "12.5",
  "quantity": "100",
  "weight": "250.5",
  "cast_id": "CAST123",
  "vs_no": "VS001",
  "po_no": "PO2024001",
  "location": "1"
}
```

#### Parameters
- `cutlength` (string, required): Length of the cut in feet
- `quantity` (string, required): Number of pieces in the bundle
- `weight` (string, required): Total weight in kg
- `cast_id` (string, required): Cast identification number
- `vs_no` (string, required): Variant section number
- `po_no` (string, required): Purchase order number
- `location` (string, required): Storage location code

#### Response
```json
{
  "uid": "clxabc123def456",
  "sr_no": "25A123",
  "length": 12.5,
  "quantity": 100,
  "weight": 250.5,
  "cast_id": "CAST123",
  "vs_no": "VS001",
  "po_no": "PO2024001",
  "loction": 1,
  "status": "STOCK",
  "created_at": "2025-01-15T10:30:00.000Z",
  "modified_at": "2025-01-15T10:30:00.000Z"
}
```

#### Notes
- Bundle number is auto-generated based on current year, month, and counter
- Format: `{YY}{Month Letter}{Counter}` (e.g., `25A123` = 2025, January, #123)
- Month letters: A=Jan, B=Feb, C=Mar, D=Apr, E=May, F=Jun, G=Jul, H=Aug, I=Sep, J=Oct, K=Nov, L=Dec

---

### Get Recent Bundles

Retrieve all bundles ordered by creation date (newest first).

```http
GET /api/bundle/recents
```

#### Response
```json
{
  "recentBundles": [
    {
      "uid": "clxabc123def456",
      "sr_no": "25A123",
      "length": 12.5,
      "quantity": 100,
      "weight": 250.5,
      "cast_id": "CAST123",
      "vs_no": "VS001",
      "po_no": "PO2024001",
      "loction": 1,
      "status": "STOCK",
      "created_at": "2025-01-15T10:30:00.000Z",
      "modified_at": "2025-01-15T10:30:00.000Z"
    },
    ...
  ]
}
```

---

### Get Bundle by UID

Retrieve detailed information about a specific bundle.

```http
GET /api/bundle/:uid
```

#### Path Parameters
- `uid` (string, required): Unique identifier of the bundle

#### Response
```json
{
  "uid": "clxabc123def456",
  "sr_no": "25A123",
  "length": 12.5,
  "quantity": 100,
  "weight": 250.5,
  "cast_id": "CAST123",
  "vs_no": "VS001",
  "po_no": "PO2024001",
  "loction": 1,
  "status": "STOCK",
  "created_at": "2025-01-15T10:30:00.000Z",
  "modified_at": "2025-01-15T10:30:00.000Z",
  "section": {
    "s_no": "VS001",
    "name": "10mm TMT Bar",
    "series": "A-Series",
    ...
  }
}
```

#### Error Responses
- `404` - Bundle not found

---

### Modify Bundle

Update an existing bundle's information.

```http
PUT /api/bundle/modify/:uid
```

#### Path Parameters
- `uid` (string, required): Unique identifier of the bundle

#### Request Body
```json
{
  "cutlength": "13.0",
  "quantity": "95",
  "weight": "245.0",
  "cast_id": "CAST124",
  "vs_no": "VS001",
  "po_no": "PO2024001",
  "location": "2"
}
```

#### Response
```json
{
  "uid": "clxabc123def456",
  "sr_no": "25A123",
  "length": 13.0,
  "quantity": 95,
  "weight": 245.0,
  ...
}
```

#### Error Responses
- `404` - Bundle not found

---

### Print Bundle Label

Generate and print a QR code label for a bundle.

```http
GET /api/bundle/print/:layout/:uid
```

#### Path Parameters
- `layout` (integer, required): Label layout type (0 or 1)
- `uid` (string, required): Unique identifier of the bundle

#### Response
```json
{
  "print": 1
}
```

#### Notes
- Layout 0: Compact label with logo
- Layout 1: Full detailed label
- Requires canvas module to be installed
- Sends print command to `/bt/printLabel` endpoint

---

## Variant Management

### Get All Variants

Retrieve all section variants with their specifications.

```http
GET /api/variant/all
```

#### Response
```json
{
  "variants": [
    {
      "s_no": "VS001",
      "series": "A-Series",
      "range": "{\"start\":10,\"end\":20}"
    },
    {
      "s_no": "VS002",
      "series": "B-Series",
      "range": "{\"start\":15,\"end\":25}"
    },
    ...
  ]
}
```

#### Notes
- The `range` field is always returned as valid JSON
- Empty or malformed ranges are normalized to `{"start":0,"end":0}`

---

## Bundle Movement

### Move Bundles to Sold

Transfer bundles from stock to sold inventory.

```http
POST /api/move
```

#### Request Body
```json
{
  "moveData": "25A123,25A124,25A125",
  "ref": "INV-2024-001"
}
```

#### Parameters
- `moveData` (string, required): Comma-separated list of bundle serial numbers
- `ref` (string, required): Reference number for the sale/invoice

#### Response
```json
{
  "done": true
}
```

#### Behavior
1. Checks if bundle already exists in `soldBundle` table
2. If not, copies bundle from `bundle` to `soldBundle` with status "SOLD"
3. Deletes bundle from `bundle` table
4. If bundle already in `soldBundle`, removes any ghost entries

#### Notes
- Bundles are processed in parallel for better performance (Bun mode)
- Failed bundles are logged but don't stop the entire operation

---

## Die Mutation Tasks (NEW)

Die mutation tasks manage bundles that need to be removed from active inventory due to defects, loss, or damage.

### Create Mutation Tasks

Process a batch of bundles for die mutation.

```http
POST /api/die-mutation/tasks
```

#### Request Body
```json
{
  "bundles": ["25A123", "25B456", "25C789"],
  "reason": "defective",
  "notes": "Material defects found during quality inspection"
}
```

#### Parameters
- `bundles` (array, required): Array of bundle serial numbers to mutate
- `reason` (string, optional): Reason for mutation
  - Valid values: `defective`, `lost`, `damaged`, `other`
- `notes` (string, optional): Additional notes about the mutation

#### Response
```json
{
  "success": true,
  "processed": 3,
  "failed": 0,
  "results": [
    {
      "sr_no": "25A123",
      "status": "mutated",
      "uid": "clxabc123def456"
    },
    {
      "sr_no": "25B456",
      "status": "mutated",
      "uid": "clxdef789ghi012"
    },
    {
      "sr_no": "25C789",
      "status": "mutated",
      "uid": "clxjkl345mno678"
    }
  ]
}
```

#### Error Response (Partial Failure)
```json
{
  "success": false,
  "processed": 2,
  "failed": 1,
  "results": [
    {
      "sr_no": "25A123",
      "status": "mutated",
      "uid": "clxabc123def456"
    },
    {
      "sr_no": "25B456",
      "status": "not_found"
    },
    {
      "sr_no": "25C789",
      "status": "mutated",
      "uid": "clxjkl345mno678"
    }
  ],
  "errors": [
    {
      "sr_no": "25B456",
      "error": "Bundle not found"
    }
  ]
}
```

#### Error Responses
- `400` - Invalid request (missing or invalid parameters)

#### Notes
- Changes bundle status to `RETURNED` (indicates removed from active inventory)
- Operations are processed in parallel for better performance (Bun mode)
- Continues processing even if some bundles fail

---

### Get Mutated Bundles

Retrieve all bundles that have been mutated.

```http
GET /api/die-mutation/tasks?limit=100&offset=0
```

#### Query Parameters
- `limit` (integer, optional, default: 100): Maximum number of results to return
- `offset` (integer, optional, default: 0): Number of results to skip (for pagination)

#### Response
```json
{
  "bundles": [
    {
      "uid": "clxabc123def456",
      "sr_no": "25A123",
      "length": 12.5,
      "quantity": 100,
      "weight": 250.5,
      "status": "RETURNED",
      "modified_at": "2025-01-15T14:20:00.000Z",
      "section": {
        "s_no": "VS001",
        "name": "10mm TMT Bar",
        "series": "A-Series"
      }
    },
    ...
  ],
  "total": 42,
  "limit": 100,
  "offset": 0
}
```

---

### Delete Mutated Bundle

Permanently remove a mutated bundle from the database.

**⚠️ WARNING:** This is a destructive operation and cannot be undone.

```http
DELETE /api/die-mutation/tasks/:uid
```

#### Path Parameters
- `uid` (string, required): Unique identifier of the bundle

#### Response
```json
{
  "success": true,
  "deleted": {
    "uid": "clxabc123def456",
    "sr_no": "25A123"
  }
}
```

#### Error Responses
- `404` - Bundle not found
- `400` - Bundle status is not `RETURNED` (can only delete mutated bundles)

#### Notes
- Only bundles with status `RETURNED` can be deleted
- This permanently removes the bundle from the database

---

## Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource doesn't exist |
| 500 | Internal Server Error |

---

## Rate Limiting

Currently, no rate limiting is implemented. Consider adding rate limiting for production deployments.

---

## CORS

CORS is enabled for all origins (`*`). In production, configure this to allow only specific domains.

---

## Legacy Frontend Compatibility

All endpoints maintain 100% compatibility with the existing frontend:
- Same request/response formats
- Same HTTP methods
- Same status codes
- Same error messages

The frontend can use this API as a drop-in replacement without any code changes.

---

## Performance Notes

### Bun-Native Mode
- **Simple queries**: ~1-2ms response time
- **Database queries**: ~10-15ms response time
- **Batch operations**: Parallel processing for optimal performance

### Express Mode
- **Simple queries**: ~3-5ms response time
- **Database queries**: ~15-20ms response time
- **Batch operations**: Standard sequential processing

---

## Examples

### cURL Examples

#### Create a bundle
```bash
curl -X POST http://localhost:3000/api/bundle/create \
  -H "Content-Type: application/json" \
  -d '{
    "cutlength": "12.5",
    "quantity": "100",
    "weight": "250.5",
    "cast_id": "CAST123",
    "vs_no": "VS001",
    "po_no": "PO2024001",
    "location": "1"
  }'
```

#### Move bundles to sold
```bash
curl -X POST http://localhost:3000/api/move \
  -H "Content-Type: application/json" \
  -d '{
    "moveData": "25A123,25A124",
    "ref": "INV-2024-001"
  }'
```

#### Create die mutation tasks
```bash
curl -X POST http://localhost:3000/api/die-mutation/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "bundles": ["25A123", "25B456"],
    "reason": "defective",
    "notes": "Surface defects found"
  }'
```

### JavaScript/Fetch Examples

#### Get all variants
```javascript
const response = await fetch('http://localhost:3000/api/variant/all');
const data = await response.json();
console.log(data.variants);
```

#### Create bundle with error handling
```javascript
try {
  const response = await fetch('http://localhost:3000/api/bundle/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cutlength: "12.5",
      quantity: "100",
      weight: "250.5",
      cast_id: "CAST123",
      vs_no: "VS001",
      po_no: "PO2024001",
      location: "1"
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const bundle = await response.json();
  console.log('Bundle created:', bundle.sr_no);
} catch (error) {
  console.error('Error creating bundle:', error);
}
```

---

**Last Updated:** December 2024  
**API Version:** 1.0  
**Server Version:** Bun 1.1.30
