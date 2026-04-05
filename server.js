{
  "version": 2,
  "cleanUrls": true,
  "trailingSlash": false,
  "functions": {
    "api/*.js": {
      "runtime": "@vercel/node"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
