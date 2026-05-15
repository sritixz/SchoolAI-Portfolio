#!/usr/bin/env python3
"""
Test script for Educational Media Researcher Query Optimizer.

Tests query optimization for high-precision educational image search.
"""

from services.query_optimizer import QueryOptimizer

def test_query_optimizer():
    """Test query optimization with various student queries."""
    
    optimizer = QueryOptimizer()
    
    test_cases = [
        {
            "query": "Can you explain the human heart for my class 10 exam?",
            "grade": "10",
            "board": "CBSE",
            "expected_topic": "human heart",
        },
        {
            "query": "What is photosynthesis?",
            "grade": "9",
            "board": "CBSE",
            "expected_topic": "photosynthesis",
        },
        {
            "query": "Explain mitosis in detail",
            "grade": "11",
            "board": "CBSE",
            "expected_topic": "mitosis",
        },
        {
            "query": "How does the water cycle work?",
            "grade": "6",
            "board": "CBSE",
            "expected_topic": "water cycle",
        },
        {
            "query": "Tell me about Newton's laws of motion",
            "grade": "10",
            "board": "CBSE",
            "expected_topic": "Newton's laws",
        },
        {
            "query": "What is the structure of a plant cell?",
            "grade": "8",
            "board": "CBSE",
            "expected_topic": "plant cell",
        },
        {
            "query": "Explain the process of digestion",
            "grade": "7",
            "board": "CBSE",
            "expected_topic": "digestion",
        },
        {
            "query": "How does photosynthesis work in plants?",
            "grade": "9",
            "board": "ICSE",
            "expected_topic": "photosynthesis",
        },
    ]
    
    print("=" * 100)
    print("EDUCATIONAL MEDIA RESEARCHER - QUERY OPTIMIZER TEST")
    print("=" * 100)
    
    for i, test_case in enumerate(test_cases, 1):
        query = test_case["query"]
        grade = test_case["grade"]
        board = test_case["board"]
        expected_topic = test_case["expected_topic"]
        
        print(f"\n{'─' * 100}")
        print(f"Test {i}: {query}")
        print(f"Grade: {grade}, Board: {board}")
        
        # Extract core topic
        core_topic = optimizer.extract_core_topic(query)
        print(f"✓ Core Topic: {core_topic}")
        
        # Build optimized query
        optimized = optimizer.build_optimized_query(query, grade, board)
        print(f"✓ Optimized Query:\n  {optimized}")
        
        # Verify core topic extraction
        if core_topic and expected_topic.lower() in core_topic.lower():
            print(f"✓ Topic extraction: PASS")
        else:
            print(f"⚠ Topic extraction: Expected '{expected_topic}', got '{core_topic}'")
        
        # Verify educational intent keywords are present
        educational_keywords = ["labeled diagram", "infographic", "schematic", "structure", "anatomy"]
        found_keywords = [kw for kw in educational_keywords if kw in optimized.lower()]
        if found_keywords:
            print(f"✓ Educational intent: {', '.join(found_keywords)}")
        else:
            print(f"⚠ Educational intent: No keywords found")
        
        # Verify noise exclusion
        noise_keywords = ["-screenshot", "-logo", "-flag", "-photo"]
        found_noise = [kw for kw in noise_keywords if kw in optimized]
        if found_noise:
            print(f"✓ Noise exclusion: {', '.join(found_noise)}")
        else:
            print(f"⚠ Noise exclusion: No exclusions found")
        
        # Verify grade context
        if f"Grade {grade}" in optimized:
            print(f"✓ Grade context: Grade {grade} {board}")
        else:
            print(f"⚠ Grade context: Not found")
        
        # Verify source scoping
        if "site:wikimedia.org" in optimized or "site:britannica.com" in optimized:
            print(f"✓ Source scoping: Educational sources included")
        else:
            print(f"⚠ Source scoping: Not found")
    
    print(f"\n{'=' * 100}")
    print("TEST COMPLETE")
    print("=" * 100)


def test_tier_specific_optimization():
    """Test tier-specific query optimization."""
    
    optimizer = QueryOptimizer()
    base_query = "photosynthesis"
    
    print("\n" + "=" * 100)
    print("TIER-SPECIFIC QUERY OPTIMIZATION")
    print("=" * 100)
    
    print(f"\nBase Query: {base_query}")
    
    tier1_query = optimizer.optimize_for_tier1(base_query)
    print(f"\nTier 1 (Bing Images):\n  {tier1_query}")
    
    tier2_query = optimizer.optimize_for_tier2(base_query)
    print(f"\nTier 2 (Wikipedia):\n  {tier2_query}")
    
    tier3_query = optimizer.optimize_for_tier3(base_query)
    print(f"\nTier 3 (Commons):\n  {tier3_query}")


def test_asset_prioritization():
    """Test asset type prioritization."""
    
    optimizer = QueryOptimizer()
    
    test_images = [
        {
            "url": "https://example.com/image.jpg",
            "title": "Image 1",
            "width": 600,
            "height": 400,
        },
        {
            "url": "https://example.com/diagram.svg",
            "title": "Diagram SVG",
            "width": 800,
            "height": 600,
        },
        {
            "url": "https://example.com/chart.png",
            "title": "Chart PNG",
            "width": 400,
            "height": 300,
        },
        {
            "url": "https://example.com/transparent.png",
            "title": "Transparent PNG",
            "width": 700,
            "height": 500,
        },
    ]
    
    print("\n" + "=" * 100)
    print("ASSET TYPE PRIORITIZATION")
    print("=" * 100)
    
    print("\nOriginal order:")
    for i, img in enumerate(test_images, 1):
        print(f"  {i}. {img['title']} ({img['url'].split('/')[-1]})")
    
    prioritized = optimizer.prioritize_asset_types(test_images)
    
    print("\nPrioritized order (SVG/PNG first):")
    for i, img in enumerate(prioritized, 1):
        print(f"  {i}. {img['title']} ({img['url'].split('/')[-1]})")


if __name__ == "__main__":
    test_query_optimizer()
    test_tier_specific_optimization()
    test_asset_prioritization()
