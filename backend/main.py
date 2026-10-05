import os
import shutil
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from mongomock_motor import AsyncMongoMockClient as AsyncIOMotorClient
from pydantic import BaseModel

load_dotenv()
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "credx_goa")
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Scoring rules (from the project spec)
AWARD_POINTS = {"Winner": 100, "Runner-up": 70, "Finalist": 40, "Participant": 20}
COMP_CAP = 300

client = None
db = None


def mk(id_, name, roll, college, short, dept, cgpa, comp, courses, creds, views, fac, ach):
    acad = round(cgpa * 40)
    return {
        "_id": id_, "name": name, "avatar": "".join(w[0] for w in name.split()[:2]),
        "rollNo": roll, "college": college, "collegeShort": short, "department": dept,
        "cgpa": cgpa,
        "scores": {"academics": acad, "competitions": comp, "courses": courses,
                   "overall": acad + comp + courses},
        "verifiedCredentialsCount": creds, "profileViews": views,
        "facultyIncharge": fac, "achievements": ach,
    }


FAC = {
    "RIT": {"name": "Prof. Shailesh Khanolkar", "designation": "HOD IT & T&P Coordinator",
            "email": "tnp@ritgoa.ac.in", "phone": "+91 832 277 0123"},
    "GEC": {"name": "Dr. Rajesh Gaonkar", "designation": "T&P Cell Lead",
            "email": "tnp@gec.ac.in", "phone": "+91 832 239 9000"},
    "PCCE": {"name": "Prof. Supriya Patil", "designation": "Associate Professor",
             "email": "tnp@pcce.ac.in", "phone": "+91 832 255 1234"},
    "DBCE": {"name": "Prof. Alister D'Silva", "designation": "Faculty Coordinator",
             "email": "tnp@dbce.ac.in", "phone": "+91 832 274 3900"},
}
C = {"RIT": "RIT Goa", "GEC": "GEC Goa", "PCCE": "PCCE Goa", "DBCE": "DBCE Goa"}


def seed_students():
    m = lambda *a: mk(*a)
    return [
        m("stud_aarav", "Aarav Naik", "CS23-14", C["GEC"], "GEC Goa", "Computer Engineering", 9.55, 279, 280, 12, 342, FAC["GEC"], ["Smart India Hackathon Finalist", "NPTEL Elite · Data Structures"]),
        m("stud_saanvi", "Saanvi Prabhu", "EC23-07", C["PCCE"], "PCCE Goa", "Electronics", 9.35, 267, 266, 10, 287, FAC["PCCE"], ["Robotics Nationals Winner", "Cisco CCNA"]),
        m("stud_rohan", "Rohan Dessai", "ME22-21", C["DBCE"], "DBCE Goa", "Mechanical", 8.90, 234, 240, 8, 201, FAC["DBCE"], ["BAJA Goa Winner"]),
        m("stud_ishita", "Ishita Kamat", "CS24-18", C["RIT"], "RIT Goa", "Computer Engineering", 9.10, 221, 235, 9, 176, FAC["RIT"], ["CodeChef Contest Top 50"]),
        m("stud_vedant", "Vedant Borkar", "IT23-04", C["GEC"], "GEC Goa", "Information Technology", 8.80, 218, 224, 8, 160, FAC["GEC"], ["AWS Cloud Practitioner"]),
        m("stud_neha", "Neha Fernandes", "CS23-22", C["PCCE"], "PCCE Goa", "Computer Engineering", 8.60, 205, 221, 7, 143, FAC["PCCE"], ["Hack4Goa Runner-up"]),
        m("stud_kunal", "Kunal Gaonkar", "IT23-11", C["DBCE"], "DBCE Goa", "Information Technology", 8.50, 196, 214, 7, 131, FAC["DBCE"], ["Google Cloud Skills Badge"]),
        m("stud_tanvi", "Tanvi Sawant", "ET24-12", C["DBCE"], "DBCE Goa", "Electronics & Telecom", 8.20, 190, 212, 6, 112, FAC["DBCE"], ["IoT Challenge Finalist"]),
        m("stud_rahul", "Rahul Deshpande", "IT24-18", C["PCCE"], "PCCE Goa", "Information Technology", 8.10, 172, 196, 6, 98, FAC["PCCE"], ["NPTEL Python Elite"]),
        m("stud_mohit", "Mohit Kumar", "IT24-09", C["RIT"], "RIT Goa", "Information Technology", 8.44, 181, 223, 7, 128, FAC["RIT"], ["Inter-college Debate · Runner-up", "AWS Cloud Practitioner", "NPTEL Elite · Java"]),
        m("stud_ananya", "Ananya Shenoy", "IT23-32", C["PCCE"], "PCCE Goa", "Information Technology", 8.55, 177, 209, 6, 90, FAC["PCCE"], ["Coursera ML Specialisation"]),
    ]


def seed_competitions():
    now = datetime.utcnow()
    d = lambda days: now + timedelta(days=days)
    return [
        {"_id": "comp_1", "title": "Smart Goa Hackathon 2026", "organizer": "Directorate of Technical Education, Goa",
         "venue": "Panaji", "date": d(18).strftime("%b %d, %Y"), "deadline": d(12).isoformat(),
         "tags": ["AI/ML", "Civic Tech", "Smart City"], "departments": ["Information Technology", "Computer Engineering"],
         "description": "State-level hackathon building civic solutions for Goa."},
        {"_id": "comp_2", "title": "Quark TechFest 2026", "organizer": "BITS Pilani, Goa Campus",
         "venue": "Zuarinagar", "date": d(33).strftime("%b %d, %Y"), "deadline": d(25).isoformat(),
         "tags": ["Robotics", "IoT", "Open Innovation"], "departments": ["Electronics", "Electronics & Telecom", "Mechanical", "Computer Engineering"],
         "description": "Coding, robotics and open innovation tracks."},
        {"_id": "comp_3", "title": "Code for Coast", "organizer": "Goa State Biodiversity Board",
         "venue": "Miramar, Panaji", "date": d(47).strftime("%b %d, %Y"), "deadline": d(40).isoformat(),
         "tags": ["Sustainability", "Data Science"], "departments": ["Information Technology", "Computer Engineering"],
         "description": "Marine data challenge on coastal erosion and fisheries."},
    ]


def seed_certs():
    return [{
        "_id": "cert_mohit_01", "studentId": "stud_mohit", "studentName": "Mohit Kumar",
        "studentRollNo": "IT24-09", "college": C["RIT"], "certificateTitle": "Smart Goa Hackathon Winner",
        "awardType": "Winner", "submittedAt": (datetime.utcnow() - timedelta(hours=2)).isoformat(),
        "fileType": "PDF", "fileSize": "2.4 MB", "filePath": None, "status": "PENDING", "pointsToAward": 100,
    }]


async def recalculate_ranks():
    students = await db.students.find({}).sort("scores.overall", -1).to_list(1000)
    per_college = {}
    for i, s in enumerate(students, start=1):
        per_college[s["college"]] = per_college.get(s["college"], 0) + 1
        await db.students.update_one({"_id": s["_id"]}, {"$set": {
            "stateRank": i, "collegeRank": per_college[s["college"]]}})


async def reseed():
    for col in ("students", "competitions", "certificates", "inquiries"):
        await db[col].delete_many({})
    await db.students.insert_many(seed_students())
    await db.competitions.insert_many(seed_competitions())
    await db.certificates.insert_many(seed_certs())
    await recalculate_ranks()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, db
    client = AsyncIOMotorClient(MONGODB_URI)
    db = client[DB_NAME]
    if await db.students.count_documents({}) == 0:
        await reseed()
    yield
    client.close()


app = FastAPI(title="CredX Goa API", version="1.1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


def out(doc):
    doc = dict(doc)
    doc["id"] = doc.pop("_id")
    return doc


def mask(student):
    s = out(student)
    s["rollNo"] = s["rollNo"].split("-")[0] + "-**"
    if s.get("facultyIncharge"):  # keep the official contact desk, hide the phone number
        s["facultyIncharge"] = {k: v for k, v in s["facultyIncharge"].items() if k != "phone"}
    s.pop("profileViews", None)
    return s


# ---------------- Endpoints ----------------

@app.get("/api/leaderboard")
async def leaderboard(scope: str = "state", college: Optional[str] = None,
                      public: bool = False, limit: int = 100):
    """scope=state|college. public=true -> recruiter view: masked roll numbers, top N only."""
    query = {"college": college} if scope == "college" and college else {}
    docs = await db.students.find(query).sort("scores.overall", -1).to_list(min(limit, 100))
    return [mask(d) if public else out(d) for d in docs]


@app.get("/api/students/{student_id}")
async def get_student(student_id: str, view: bool = False):
    if view:  # count a profile view
        await db.students.update_one({"_id": student_id}, {"$inc": {"profileViews": 1}})
    s = await db.students.find_one({"_id": student_id})
    if not s:
        raise HTTPException(404, "Student not found")
    return out(s)


@app.get("/api/competitions")
async def competitions():
    docs = await db.competitions.find({}).to_list(50)
    now = datetime.utcnow()
    res = []
    for c in docs:
        left = datetime.fromisoformat(c["deadline"]) - now
        c = out(c)
        c["daysLeft"] = max(left.days, 0)
        c["hoursLeft"] = max(left.seconds // 3600, 0)
        res.append(c)
    return sorted(res, key=lambda c: c["daysLeft"])


@app.get("/api/recommendations/{student_id}")
async def recommendations(student_id: str):
    """Transparent rule-based recommender + score-balancing alert (no hidden model)."""
    s = await db.students.find_one({"_id": student_id})
    if not s:
        raise HTTPException(404, "Student not found")
    comps = await competitions()
    ranked = []
    for c in comps:
        dept_match = s["department"] in c["departments"]
        pts = 50 + (30 if dept_match else 0) + (10 if c["daysLeft"] > 7 else 0) \
            + (10 if s["scores"]["competitions"] < COMP_CAP else 0)
        reason = (f"Matches your {s['department']} background" if dept_match
                  else "Open to all branches") + f"; {c['daysLeft']} days left to register"
        ranked.append({"id": c["id"], "match": pts, "recommended": pts >= 80, "reason": reason})
    sc = s["scores"]
    alerts = []
    if sc["courses"] >= 270:
        alerts.append("Coursework is almost maxed - hackathon wins are now your fastest way up.")
    room = COMP_CAP - sc["competitions"]
    alerts.append(f"You have {room} competition points left before the {COMP_CAP}-point cap.")
    return {"recommendations": sorted(ranked, key=lambda r: -r["match"]), "alerts": alerts}


@app.post("/api/certificates/upload")
async def upload_certificate(student_id: str = Form(...), event_name: str = Form(...),
                             award_type: str = Form("Participant"), file: UploadFile = File(...)):
    student = await db.students.find_one({"_id": student_id})
    if not student:
        raise HTTPException(404, "Student not found")
    ext = (file.filename or "file.pdf").rsplit(".", 1)[-1].lower()
    if ext not in ("pdf", "png", "jpg", "jpeg"):
        raise HTTPException(400, "Only PDF, PNG or JPG allowed")
    cert_id = f"cert_{int(datetime.utcnow().timestamp() * 1000)}"
    path = os.path.join(UPLOAD_DIR, f"{cert_id}.{ext}")
    with open(path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    size = os.path.getsize(path)
    if size > 10 * 1024 * 1024:
        os.remove(path)
        raise HTTPException(400, "File exceeds 10 MB")
    cert = {
        "_id": cert_id, "studentId": student_id, "studentName": student["name"],
        "studentRollNo": student["rollNo"], "college": student["college"],
        "certificateTitle": f"{event_name} {award_type}", "awardType": award_type,
        "submittedAt": datetime.utcnow().isoformat(), "fileType": ext.upper(),
        "fileSize": f"{size / 1048576:.1f} MB" if size > 1048576 else f"{max(size // 1024, 1)} KB",
        "filePath": path, "status": "PENDING", "pointsToAward": AWARD_POINTS.get(award_type, 20),
    }
    await db.certificates.insert_one(cert)
    return {"message": "Submitted for faculty review", "certificate": out(cert)}


@app.get("/api/faculty/pending-certificates")
async def pending(college: Optional[str] = None):
    q = {"status": "PENDING"}
    if college:
        q["college"] = college
    return [out(c) for c in await db.certificates.find(q).sort("submittedAt", -1).to_list(50)]


@app.post("/api/faculty/approve/{cert_id}")
async def approve(cert_id: str):
    cert = await db.certificates.find_one({"_id": cert_id})
    if not cert:
        raise HTTPException(404, "Certificate not found")
    if cert["status"] != "PENDING":
        raise HTTPException(409, f"Already {cert['status'].lower()}")
    student = await db.students.find_one({"_id": cert["studentId"]})
    before = {"rank": student["stateRank"], "score": student["scores"]["overall"]}
    pts = min(cert["pointsToAward"], COMP_CAP - student["scores"]["competitions"])  # enforce cap
    pts = max(pts, 0)
    await db.certificates.update_one({"_id": cert_id}, {"$set": {
        "status": "APPROVED", "awardedPoints": pts, "reviewedAt": datetime.utcnow().isoformat()}})
    await db.students.update_one({"_id": student["_id"]}, {
        "$inc": {"scores.competitions": pts, "scores.overall": pts, "verifiedCredentialsCount": 1},
        "$push": {"achievements": cert["certificateTitle"]}})
    await recalculate_ranks()
    after = await db.students.find_one({"_id": student["_id"]})
    return {"status": "SUCCESS", "points": pts, "before": before,
            "after": {"rank": after["stateRank"], "score": after["scores"]["overall"]},
            "student": out(after)}


@app.post("/api/faculty/reject/{cert_id}")
async def reject(cert_id: str):
    r = await db.certificates.update_one({"_id": cert_id, "status": "PENDING"},
                                         {"$set": {"status": "REJECTED"}})
    if not r.matched_count:
        raise HTTPException(404, "No pending certificate")
    return {"status": "REJECTED"}


class Inquiry(BaseModel):
    studentId: str
    company: str
    recruiterEmail: str
    message: str = ""


@app.post("/api/inquiries")
async def inquiry(body: Inquiry):
    """Recruiters never contact students directly; inquiries route to the Faculty Incharge."""
    s = await db.students.find_one({"_id": body.studentId})
    if not s:
        raise HTTPException(404, "Student not found")
    doc = {**body.model_dump(), "_id": f"inq_{int(datetime.utcnow().timestamp() * 1000)}",
           "routedTo": s["facultyIncharge"]["email"], "createdAt": datetime.utcnow().isoformat()}
    await db.inquiries.insert_one(doc)
    return {"message": f"Inquiry routed to {s['facultyIncharge']['name']} ({s['collegeShort']})",
            "routedTo": doc["routedTo"]}


@app.post("/api/demo/reset")
async def demo_reset():
    """Restore the seed data so the demo can be replayed."""
    await reseed()
    return {"message": "Demo data reset"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)