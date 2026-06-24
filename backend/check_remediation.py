from fastapi.testclient import TestClient
from main import app

def main():
    with TestClient(app) as client:
        # Step 1: Request OTP for student with phone 1111111111 (Alice Johnson)
        print("Requesting OTP...")
        r1 = client.post("/auth/otp/request", json={"phone": "1111111111", "role": "student"})
        if r1.status_code != 200:
            print(f"OTP request failed: {r1.status_code} - {r1.text}")
            return
        otp = r1.json().get("dev_otp")
        print(f"OTP received: {otp}")
        
        # Step 2: Verify OTP
        r2 = client.post("/auth/otp/verify", json={"phone": "1111111111", "otp": otp, "role": "student"})
        if r2.status_code != 200:
            print(f"OTP verify failed: {r2.status_code} - {r2.text}")
            return
        token = r2.json().get("access_token")
        headers = {"Authorization": f"Bearer {token}"}
        print("Logged in successfully!")
        
        # Step 3: Get learning gaps
        r3 = client.get("/learning-gaps/", headers=headers)
        if r3.status_code != 200:
            print(f"Fetch learning gaps failed: {r3.status_code} - {r3.text}")
            return
        gaps = r3.json()
        print(f"Found {len(gaps)} learning gaps.")
        if not gaps:
            print("No gaps found.")
            return
            
        # Step 4: Try to fetch each gap details and remediation
        for gap in gaps[:3]:
            gap_id = gap.get("_id")
            print(f"\nGap: {gap.get('topic')} (ID: {gap_id})")
            
            # Fetch by ID
            r_detail = client.get(f"/learning-gaps/{gap_id}", headers=headers)
            print(f"  GET /learning-gaps/{gap_id} -> HTTP {r_detail.status_code}")
            if r_detail.status_code != 200:
                print(f"    Error: {r_detail.text}")
                
            # Fetch remediation
            r_rem = client.get(f"/learning-gaps/{gap_id}/remediation", headers=headers)
            print(f"  GET /learning-gaps/{gap_id}/remediation -> HTTP {r_rem.status_code}")
            if r_rem.status_code != 200:
                print(f"    Error: {r_rem.text}")

if __name__ == "__main__":
    main()
