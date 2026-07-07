import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/server/supabase-client";
import { examReports } from "@/storage/database/shared/schema";
import { desc, eq } from "drizzle-orm";

// POST /api/reports - Save a report
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      candidate_name,
      candidate_department,
      exam_code,
      questions,
      answers,
      report,
      source,
    } = body;

    if (!candidate_name || !exam_code || !questions || !answers || !report) {
      return NextResponse.json(
        { ok: false, message: "缺少必要参数" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from("exam_reports")
      .insert({
        candidate_name,
        candidate_department: candidate_department || null,
        exam_code,
        questions,
        answers,
        report,
        source: source || "local_rule",
        review_status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("[reports POST] Supabase error:", error);
      return NextResponse.json(
        { ok: false, message: "报告保存失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data });
  } catch (error) {
    console.error("[reports POST] Error:", error);
    return NextResponse.json(
      { ok: false, message: "报告保存服务异常" },
      { status: 500 }
    );
  }
}

// GET /api/reports - List reports
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const examCode = searchParams.get("exam_code");
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = getSupabaseClient();

    let query = supabase
      .from("exam_reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (examCode) {
      query = query.eq("exam_code", examCode);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[reports GET] Supabase error:", error);
      return NextResponse.json(
        { ok: false, message: "报告查询失败" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, data: data || [] });
  } catch (error) {
    console.error("[reports GET] Error:", error);
    return NextResponse.json(
      { ok: false, message: "报告查询服务异常" },
      { status: 500 }
    );
  }
}
