import aiohttp
import asyncio

class AsyncHTTPClient:
    def __init__(self):
        self.session = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc, tb):
        await self.session.close()

    async def get(self, url, params=None, headers=None):
        try:
            async with self.session.get(url, params=params, headers=headers) as response:
                response.raise_for_status()
                return await response.json()
        except aiohttp.ClientError as e:
            raise RuntimeError(f"Async HTTP GET request failed: {e}") from e

# Usage example:
# async with AsyncHTTPClient() as client:
#     data = await client.get("https://api.example.com/data")