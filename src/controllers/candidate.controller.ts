import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { z } from "zod";
import {
  sendApplicationNotification,
  sendStatusUpdateEmail,
} from "../services/email.service";

// ==========================================
// BOOKMARKS
// ==========================================

const bookmarkSchema = z.object({
  job_id: z.string(),
  notes: z.string().optional(),
});

export const getBookmarks = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as any)?.id;

    const bookmarks = await prisma.bookmark.findMany({
      where: { user_id: userId },
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json({ bookmarks });
  } catch (err) {
    next(err);
  }
};

export const createBookmark = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { job_id, notes } = bookmarkSchema.parse(req.body);
    const userId = (req.user as any)?.id;

    // Check if job exists
    const job = await prisma.job.findUnique({ where: { id: job_id } });
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    // Create or update bookmark
    const bookmark = await prisma.bookmark.upsert({
      where: {
        user_id_job_id: {
          user_id: userId,
          job_id,
        },
      },
      update: { notes },
      create: {
        user_id: userId,
        job_id,
        notes,
      },
      include: {
        job: {
          include: { company: true },
        },
      },
    });

    res.json({ bookmark, message: "Job bookmarked successfully" });
  } catch (err) {
    next(err);
  }
};

export const deleteBookmark = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const job_id = req.params.job_id as string;
    const userId = (req.user as any)?.id;

    await prisma.bookmark.delete({
      where: {
        user_id_job_id: {
          user_id: userId,
          job_id,
        },
      },
    });

    res.json({ success: true, message: "Bookmark removed" });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// APPLICATIONS
// ==========================================

const applicationSchema = z.object({
  job_id: z.string(),
  cover_note: z.string().optional(),
});

export const getApplications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userId = (req.user as any)?.id;
    const status = req.query.status as string | undefined;

    const where: any = { user_id: userId };
    if (status) {
      where.status = status;
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        job: {
          include: {
            company: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json({ applications });
  } catch (err) {
    next(err);
  }
};

export const createApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { job_id, cover_note } = applicationSchema.parse(req.body);
    const userId = (req.user as any)?.id;

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Check if job exists and is active
    const job = await prisma.job.findUnique({
      where: { id: job_id },
      include: {
        company: {
          include: { recruiter: true },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }
    if (!job.active) {
      return res.status(400).json({ error: "This job is no longer active" });
    }

    // Check if already applied
    const existing = await prisma.application.findUnique({
      where: {
        user_id_job_id: {
          user_id: userId,
          job_id,
        },
      },
    });

    if (existing) {
      return res
        .status(400)
        .json({ error: "You have already applied to this job" });
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        user_id: userId,
        job_id,
        cover_note,
        status: "pending",
      },
      include: {
        job: {
          include: { company: true },
        },
      },
    });

    // Send email notification to company/recruiter
    const targetEmail = job.company.email || job.company.recruiter.email;
    if (targetEmail) {
      sendApplicationNotification({
        companyEmail: targetEmail,
        companyName: job.company.name,
        candidateName: user.name,
        candidateEmail: user.email,
        jobTitle: job.problem_statement,
        coverNote: cover_note,
        applicationId: application.id,
      }).catch((err) =>
        console.error("Failed to send application email:", err),
      );
    }

    res.json({ application, message: "Application submitted successfully" });
  } catch (err) {
    next(err);
  }
};

export const withdrawApplication = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const userId = (req.user as any)?.id;

    const application = await prisma.application.findUnique({
      where: { id },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    if (application.user_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    if (
      application.status === "accepted" ||
      application.status === "rejected"
    ) {
      return res.status(400).json({
        error: "Cannot withdraw an application that has been processed",
      });
    }

    await prisma.application.update({
      where: { id },
      data: { status: "withdrawn" },
    });

    res.json({ success: true, message: "Application withdrawn" });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// RECRUITER: Update Application Status
// ==========================================

const updateApplicationStatusSchema = z.object({
  status: z.enum(["pending", "reviewing", "interview", "accepted", "rejected"]),
});

export const updateApplicationStatus = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const id = req.params.id as string;
    const { status } = updateApplicationStatusSchema.parse(req.body);
    const userId = (req.user as any)?.id;

    // Get application with job details
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          include: { company: true },
        },
      },
    });

    if (!application) {
      return res.status(404).json({ error: "Application not found" });
    }

    // Verify recruiter owns this job
    if (application.job.company.recruiter_id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const updated = await prisma.application.update({
      where: { id },
      data: { status },
      include: {
        user: {
          select: { name: true, email: true },
        },
        job: {
          include: { company: true },
        },
      },
    });

    // Send email notification to candidate
    sendStatusUpdateEmail({
      candidateEmail: updated.user.email,
      candidateName: updated.user.name,
      companyName: updated.job.company.name,
      jobTitle: updated.job.problem_statement,
      newStatus: status,
      applicationId: updated.id,
    }).catch((err) =>
      console.error("Failed to send status update email:", err),
    );

    res.json({ application: updated, message: "Application status updated" });
  } catch (err) {
    next(err);
  }
};

// ==========================================
// RECRUITER: Get Applications for Jobs
// ==========================================

export const getJobApplications = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const job_id = req.params.job_id as string;
    const userId = (req.user as any)?.id;
    const status = req.query.status as string | undefined;

    // Verify job ownership
    const job = await prisma.job.findFirst({
      where: {
        id: job_id,
        company: { recruiter_id: userId },
      },
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found or unauthorized" });
    }

    const where: any = { job_id };
    if (status) {
      where.status = status;
    }

    const applications = await prisma.application.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            photo_url: true,
            intent_text: true,
            skills: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
    });

    res.json({ applications });
  } catch (err) {
    next(err);
  }
};
