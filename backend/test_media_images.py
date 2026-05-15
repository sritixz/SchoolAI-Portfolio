#!/usr/bin/env python3
"""
Test script to verify image fetching for VinAI recommendations.
Tests both Wikipedia and Commons sources with various queries.
"""
import asyncio
import sys
from services.media_search import search_images

async def test_image_search():
    """Test image search with various educational queries."""
    test_queries = [
        ("photosynthesis", "9"),
        ("Newton's laws of motion", "10"),
        ("water cycle", "6"),
        ("mitochondria structure", "11"),
        ("quadratic equations", "10"),
        ("solar system", "7"),
    ]
    
    print("=" * 80)
    print("TESTING IMAGE SEARCH FOR VINA RECOMMENDATIONS")
    print("=" * 80)
    
    for query, grade in test_queries:
        print(f"\n📚 Query: '{query}' (Grade {grade})")
        print("-" * 80)
        
        try:
            results = await search_images(query, grade=grade, board="CBSE", max_results=6)
            
            if not results:
                print("❌ No images found")
                continue
            
            print(f"✅ Found {len(results)} images:\n")
            for i, img in enumerate(results, 1):
                print(f"  {i}. {img['title']}")
                print(f"     URL: {img['url'][:70]}...")
                print(f"     Source: {img['source'][:70]}...")
                print()
        
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
    
    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)

if __name__ == "__main__":
    asyncio.run(test_image_search())
