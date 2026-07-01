from pydantic import BaseModel, Field
from typing import List, Dict

class ResumeURL(BaseModel):
    url: str = Field(..., description="The publicly accessible URL of the resume file (PDF or DOCX).")

class ParserData(BaseModel):
    skills: List[str] = Field(..., description="List of extracted skill names.")
    skill_counts: Dict[str, int] = Field(..., description="Count of occurrences of each extracted skill.")
    majority_skills: List[str] = Field(..., description="Top 5 most frequent skills extracted from the resume.")
    education: List[str] = Field(..., description="List of education entries (e.g. degrees, majors).")
    experience: List[str] = Field(..., description="List of experience duration sentences extracted.")
    job_experiences: List[str] = Field(..., description="List of extracted job roles and organizations.")
    score: int = Field(..., description="Calculated profile score ranging from 0 to 100.")
    warnings: List[str] = Field(default_factory=list, description="Non-fatal warnings or limitations during extraction.")

class ParseResponse(BaseModel):
    success: bool = Field(..., description="Whether the resume was parsed successfully.")
    data: ParserData = Field(..., description="The parsed resume data.")

class HealthResponse(BaseModel):
    status: str = Field(..., description="General API health status ('ok' or 'error').")
    model_loaded: bool = Field(..., description="True if the transformers NER model is initialized and ready.")
    version: str = Field(..., description="The API version.")
