import React, { useState, useMemo, useEffect } from "react";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Plus,
  Send,
  Trash2,
  MessageSquare,
  Search,
  Check,
  RotateCw,
  Phone,
  Calendar,
  Eye,
  Bell,
  Sparkles,
} from "lucide-react";
import type { AppData, StaffTask } from "./payroll-app";

interface TasksViewProps {
  data: AppData;
  onAction: (action: string, successMessage: string, payload?: any) => Promise<void>;
  onRefresh?: () => Promise<void>;
  isActing: boolean;
}

export function TasksView({ data, onAction, onRefresh, isActing }: TasksViewProps) {
  const tasks = data.tasks || [];
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "in_progress" | "completed">("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for New Task
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [selectedStaffUserId, setSelectedStaffUserId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("919944399088"); // default to test recipient
  const [taskDueDate, setTaskDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [taskPriority, setTaskPriority] = useState<"normal" | "high" | "urgent">("normal");
  const [sendWhatsApp, setSendWhatsApp] = useState(true);
  const [autoRemind, setAutoRemind] = useState(true);

  // Background interval check for 2-hour reminders every 10 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      onAction("trigger-due-task-reminders", "", { force: false }).catch(() => {});
    }, 10 * 60 * 1000);
    return () => clearInterval(timer);
  }, [onAction]);

  // Available staff members for assignment
  const staffMembers = useMemo(() => {
    const fromUsers = (data.appUsers || []).map((u) => ({
      id: u.id,
      name: u.fullName || u.email,
      phone: u.mobileNumber || "919944399088",
      department: u.department || "Internal Staff",
      role: u.role,
    }));
    return fromUsers;
  }, [data.appUsers]);

  // Handle staff selection in modal
  function handleSelectStaff(userId: string) {
    setSelectedStaffUserId(userId);
    const found = staffMembers.find((s) => s.id === userId);
    if (found) {
      setStaffName(found.name);
      if (found.phone) {
        setStaffPhone(found.phone);
      }
    }
  }

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const titleMatch = task.title.toLowerCase().includes(q);
        const descMatch = (task.description || "").toLowerCase().includes(q);
        const nameMatch = task.assignedToName.toLowerCase().includes(q);
        const phoneMatch = task.assignedToPhone.includes(q);
        if (!titleMatch && !descMatch && !nameMatch && !phoneMatch) return false;
      }
      return true;
    });
  }, [tasks, statusFilter, priorityFilter, searchTerm]);

  // Summary counts
  const totalCount = tasks.length;
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const urgentCount = tasks.filter((t) => ["pending", "in_progress"].includes(t.status) && t.priority === "urgent").length;

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !staffPhone.trim()) return;

    await onAction("create-staff-task", "Task assigned and WhatsApp interactive buttons sent", {
      title: taskTitle.trim(),
      description: taskDescription.trim() || null,
      assignedToUserId: selectedStaffUserId || null,
      assignedToName: staffName.trim() || "Staff Member",
      assignedToPhone: staffPhone.trim(),
      priority: taskPriority,
      dueDate: taskDueDate || null,
      sendWhatsApp,
      autoRemind,
    });

    // Reset and close
    setTaskTitle("");
    setTaskDescription("");
    setSelectedStaffUserId("");
    setStaffName("");
    setIsModalOpen(false);
  }

  async function handleToggleStatus(task: StaffTask) {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    await onAction("update-staff-task", `Task marked as ${newStatus}`, {
      id: task.id,
      status: newStatus,
      completionNotes: newStatus === "completed" ? "Marked complete via Portal" : null,
    });
  }

  async function handleSetStatus(task: StaffTask, status: string) {
    await onAction("update-staff-task", `Task status updated to ${status.replace("_", " ")}`, {
      id: task.id,
      status,
      completionNotes: status === "completed" ? "Marked complete via Portal" : null,
    });
  }

  async function handleSendReminder(task: StaffTask) {
    await onAction("send-task-whatsapp-reminder", `WhatsApp interactive reminder sent to ${task.assignedToName}`, {
      id: task.id,
    });
  }

  async function handleTrigger2HourReminders(force = false) {
    await onAction("trigger-due-task-reminders", force ? "Dispatched 2-hour interval reminders" : "Checked 2-hour reminders", {
      force,
    });
  }

  async function handleDeleteTask(taskId: string, title: string) {
    if (!window.confirm(`Are you sure you want to delete task "${title}"?`)) return;
    await onAction("delete-staff-task", "Task deleted", { id: taskId });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      {/* Top Banner / Integration Bar */}
      <div
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          color: "#ffffff",
          borderRadius: "14px",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.25)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(34, 197, 94, 0.2)",
                color: "#4ade80",
                fontSize: "12px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(74, 222, 128, 0.3)",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  display: "inline-block",
                }}
              />
              Meta WhatsApp API Connected
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(56, 189, 248, 0.2)",
                color: "#38bdf8",
                fontSize: "12px",
                fontWeight: 700,
                padding: "3px 10px",
                borderRadius: "20px",
                border: "1px solid rgba(56, 189, 248, 0.3)",
              }}
            >
              <span
                style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#38bdf8",
                  display: "inline-block",
                  boxShadow: "0 0 6px #38bdf8",
                }}
              />
              Live Realtime Sync
            </span>
            <span style={{ fontSize: "12px", color: "#94a3b8" }}>Test Sender: +1 (555) 649-0925</span>
          </div>
          <h2 style={{ margin: "8px 0 4px", fontSize: "1.45rem", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Staff Task Assignment &amp; WhatsApp Interactive Reporting
          </h2>
          <p style={{ margin: 0, fontSize: "13px", color: "#cbd5e1" }}>
            Staff receives interactive WhatsApp buttons (<strong>👍 Accept Task</strong> &amp; <strong>✅ Task Completed</strong>). Automatic 2-hour reminders keep staff accountable.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          {onRefresh ? (
            <button
              type="button"
              className="secondary-button"
              style={{
                background: "rgba(255, 255, 255, 0.12)",
                borderColor: "rgba(255, 255, 255, 0.25)",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                fontWeight: 600,
                fontSize: "13px",
              }}
              disabled={isActing}
              onClick={() => void onRefresh()}
              title="Instantly pulls latest status from database"
            >
              <RotateCw size={14} />
              <span>Sync Now</span>
            </button>
          ) : null}

          <button
            type="button"
            className="secondary-button"
            style={{
              background: "rgba(255, 255, 255, 0.12)",
              borderColor: "rgba(255, 255, 255, 0.25)",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              fontWeight: 600,
              fontSize: "13px",
            }}
            disabled={isActing}
            onClick={() => handleTrigger2HourReminders(true)}
            title="Checks and immediately dispatches 2-hour interval reminders to all pending/in-progress tasks"
          >
            <Clock size={15} />
            <span>⏰ Run 2h Reminders Check</span>
          </button>

          <button
            type="button"
            className="primary-button"
            style={{
              background: "#22c55e",
              borderColor: "#16a34a",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              fontWeight: 600,
              fontSize: "13px",
              boxShadow: "0 4px 14px rgba(34, 197, 94, 0.35)",
            }}
            onClick={() => setIsModalOpen(true)}
          >
            <Plus size={16} />
            <span>+ Assign New Task</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
        <div className="panel" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb",
            }}
          >
            <Calendar size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Tasks</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0f172a" }}>{totalCount}</div>
          </div>
        </div>

        <div className="panel" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#fffbeb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#d97706",
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Pending Acceptance</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#d97706" }}>{pendingCount}</div>
          </div>
        </div>

        <div className="panel" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#0284c7",
            }}
          >
            <Eye size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Accepted / In Progress</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0284c7" }}>{inProgressCount}</div>
          </div>
        </div>

        <div className="panel" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#f0fdf4",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#16a34a",
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Completed</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#16a34a" }}>{completedCount}</div>
          </div>
        </div>

        <div className="panel" style={{ padding: "16px 18px", display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "10px",
              background: "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#dc2626",
            }}
          >
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Urgent Active</div>
            <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#dc2626" }}>{urgentCount}</div>
          </div>
        </div>
      </div>

      {/* Main Filter & Task Board */}
      <div className="panel" style={{ padding: "20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "18px",
            borderBottom: "1px solid #f1f5f9",
            paddingBottom: "14px",
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <button
              type="button"
              className={statusFilter === "all" ? "primary-button" : "secondary-button"}
              style={{ fontSize: "12px", padding: "6px 14px" }}
              onClick={() => setStatusFilter("all")}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              className={statusFilter === "pending" ? "primary-button" : "secondary-button"}
              style={{ fontSize: "12px", padding: "6px 14px" }}
              onClick={() => setStatusFilter("pending")}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              className={statusFilter === "in_progress" ? "primary-button" : "secondary-button"}
              style={{ fontSize: "12px", padding: "6px 14px" }}
              onClick={() => setStatusFilter("in_progress")}
            >
              Accepted / In Progress ({inProgressCount})
            </button>
            <button
              type="button"
              className={statusFilter === "completed" ? "primary-button" : "secondary-button"}
              style={{ fontSize: "12px", padding: "6px 14px" }}
              onClick={() => setStatusFilter("completed")}
            >
              Completed ({completedCount})
            </button>
          </div>

          {/* Search & Priority filters */}
          <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
              <input
                type="search"
                placeholder="Search tasks or staff..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "7px 12px 7px 32px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  fontSize: "12px",
                  width: "240px",
                }}
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "12px",
                background: "#ffffff",
              }}
            >
              <option value="all">All Priorities</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Task List Table */}
        {filteredTasks.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#64748b" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                background: "#f1f5f9",
                margin: "0 auto 12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#94a3b8",
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <h4 style={{ margin: "0 0 4px", fontSize: "15px", fontWeight: 700, color: "#1e293b" }}>
              No tasks found
            </h4>
            <p style={{ margin: 0, fontSize: "13px" }}>
              {tasks.length === 0
                ? "Assign your first task above to send a real-time WhatsApp alert with action buttons to your staff."
                : "No tasks match your current filter criteria."}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="payroll-table" style={{ width: "100%", textAlign: "left", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Task Title &amp; Details</th>
                  <th>Assigned Staff</th>
                  <th>Priority</th>
                  <th>Due Date</th>
                  <th>WhatsApp Interactive &amp; Reminders</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => {
                  const isDone = task.status === "completed";
                  const isAccepted = task.status === "in_progress";
                  const priorityColor =
                    task.priority === "urgent"
                      ? { bg: "#fef2f2", text: "#dc2626", border: "#fca5a5" }
                      : task.priority === "high"
                      ? { bg: "#fffbeb", text: "#d97706", border: "#fcd34d" }
                      : { bg: "#f0fdf4", text: "#16a34a", border: "#86efac" };

                  return (
                    <tr
                      key={task.id}
                      style={{
                        background: isDone ? "#fafafa" : isAccepted ? "#f8fafc" : undefined,
                        opacity: isDone ? 0.9 : 1,
                      }}
                    >
                      {/* Status */}
                      <td style={{ width: "150px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(task)}
                            disabled={isActing}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "6px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              border: `1px solid ${
                                isDone ? "#86efac" : isAccepted ? "#93c5fd" : "#cbd5e1"
                              }`,
                              background: isDone ? "#f0fdf4" : isAccepted ? "#eff6ff" : "#ffffff",
                              color: isDone ? "#16a34a" : isAccepted ? "#0284c7" : "#475569",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                            }}
                            title="Click to toggle Pending / Completed"
                          >
                            {isDone ? (
                              <Check size={12} />
                            ) : isAccepted ? (
                              <Eye size={12} />
                            ) : (
                              <Clock size={12} />
                            )}
                            <span>
                              {isDone ? "Completed" : isAccepted ? "In Progress" : "Pending"}
                            </span>
                          </button>

                          {!isDone && !isAccepted ? (
                            <button
                              type="button"
                              onClick={() => handleSetStatus(task, "in_progress")}
                              disabled={isActing}
                              style={{
                                fontSize: "10px",
                                color: "#0284c7",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                textAlign: "left",
                                padding: "0 4px",
                                textDecoration: "underline",
                              }}
                            >
                              Mark Accepted
                            </button>
                          ) : null}
                        </div>
                      </td>

                      {/* Title & Description */}
                      <td style={{ minWidth: "260px" }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: isDone ? "#64748b" : "#0f172a",
                            textDecoration: isDone ? "line-through" : "none",
                          }}
                        >
                          {task.title}
                        </div>
                        {task.description ? (
                          <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>
                            {task.description}
                          </div>
                        ) : null}

                        {/* Acceptance info */}
                        {task.acceptedAt ? (
                          <div style={{ fontSize: "11px", color: "#0284c7", marginTop: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
                            <Eye size={11} />
                            <span>
                              Staff Accepted on{" "}
                              {new Date(task.acceptedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                            </span>
                          </div>
                        ) : null}

                        {/* Completion info */}
                        {task.completedAt ? (
                          <div style={{ fontSize: "11px", color: "#16a34a", marginTop: "4px" }}>
                            ✓ Completed on{" "}
                            {new Date(task.completedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                            {task.completionNotes ? ` (${task.completionNotes})` : ""}
                          </div>
                        ) : null}
                      </td>

                      {/* Assigned Staff */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              background: "#e2e8f0",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "12px",
                              fontWeight: 700,
                              color: "#334155",
                            }}
                          >
                            {task.assignedToName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <strong style={{ display: "block", fontSize: "12px" }}>{task.assignedToName}</strong>
                            <span style={{ fontSize: "11px", color: "#64748b", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Phone size={10} /> +{task.assignedToPhone}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Priority */}
                      <td>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: 800,
                            textTransform: "uppercase",
                            padding: "3px 8px",
                            borderRadius: "6px",
                            background: priorityColor.bg,
                            color: priorityColor.text,
                            border: `1px solid ${priorityColor.border}`,
                          }}
                        >
                          {task.priority}
                        </span>
                      </td>

                      {/* Due Date */}
                      <td style={{ fontSize: "12px" }}>
                        {task.dueDate ? (
                          <span style={{ fontWeight: 600 }}>{task.dueDate}</span>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>

                      {/* WhatsApp Status & 2-Hour Reminders */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "11px" }}>
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 8px",
                                borderRadius: "12px",
                                background: task.whatsappStatus?.includes("sent") ? "#f0fdf4" : "#f8fafc",
                                color: task.whatsappStatus?.includes("sent") ? "#16a34a" : "#64748b",
                                border: "1px solid",
                                borderColor: task.whatsappStatus?.includes("sent") ? "#bbf7d0" : "#e2e8f0",
                                fontWeight: 600,
                              }}
                            >
                              <MessageSquare size={11} />
                              <span>{task.whatsappStatus?.includes("sent") ? "Buttons Delivered" : task.whatsappStatus || "Queued"}</span>
                            </span>
                          </div>

                          {/* 2-hour Auto reminder status */}
                          <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#475569", fontSize: "10.5px" }}>
                            <Bell size={10} color="#64748b" />
                            <span>
                              Auto-Remind (2h):{" "}
                              <strong style={{ color: task.autoRemind === 0 ? "#94a3b8" : "#2563eb" }}>
                                {task.autoRemind === 0 ? "Off" : "Every 2h"}
                              </strong>
                              {task.reminderCount ? ` (${task.reminderCount} sent)` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          {!isDone ? (
                            <button
                              type="button"
                              className="record-action"
                              title="Resend WhatsApp interactive buttons reminder"
                              disabled={isActing}
                              onClick={() => handleSendReminder(task)}
                              style={{ color: "#2563eb", borderColor: "#bfdbfe" }}
                            >
                              <Send size={12} style={{ marginRight: "3px" }} />
                              Remind
                            </button>
                          ) : null}

                          <button
                            type="button"
                            className="record-action record-delete"
                            title="Delete task"
                            disabled={isActing}
                            onClick={() => handleDeleteTask(task.id, task.title)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Create New Task */}
      {isModalOpen ? (
        <div className="modal-layer">
          <button
            type="button"
            className="modal-scrim"
            onClick={() => !isActing && setIsModalOpen(false)}
            aria-label="Close modal"
          />
          <div
            className="panel"
            style={{
              position: "relative",
              zIndex: 10,
              maxWidth: "560px",
              width: "92vw",
              margin: "auto",
              background: "#ffffff",
              borderRadius: "14px",
              boxShadow: "0 20px 50px rgba(15, 23, 42, 0.28)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", paddingBottom: "14px" }}>
              <div>
                <span className="eyebrow" style={{ color: "#22c55e" }}>WhatsApp Delegation</span>
                <h3 style={{ margin: "4px 0 0", fontSize: "1.25rem", fontWeight: 700, color: "#0f172a" }}>
                  Assign Task to Staff
                </h3>
              </div>
              <button
                type="button"
                className="icon-button"
                style={{ fontSize: "20px", cursor: "pointer" }}
                onClick={() => setIsModalOpen(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateTask} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {/* Task Title */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Task Title *</span>
                <input
                  type="text"
                  placeholder="e.g. Verify ESI Challan for September 2026"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                />
              </label>

              {/* Task Description */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Description (Optional)</span>
                <textarea
                  placeholder="Additional instructions or notes for the staff..."
                  rows={2}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", resize: "vertical" }}
                />
              </label>

              {/* Staff Assignee */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Assign To (Staff) *</span>
                  <select
                    value={selectedStaffUserId}
                    onChange={(e) => handleSelectStaff(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  >
                    <option value="">Choose Staff / Enter Custom</option>
                    {staffMembers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.department})
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Staff Name</span>
                  <input
                    type="text"
                    placeholder="Staff Full Name"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    required
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </label>
              </div>

              {/* WhatsApp Phone & Due Date */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>WhatsApp Number *</span>
                  <input
                    type="tel"
                    placeholder="e.g. 919944399088"
                    value={staffPhone}
                    onChange={(e) => setStaffPhone(e.target.value)}
                    required
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                  <small style={{ color: "#64748b", fontSize: "11px" }}>
                    In sandbox test, use your verified test mobile number.
                  </small>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "13px", fontWeight: 600 }}>Due Date</span>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                  />
                </label>
              </div>

              {/* Priority */}
              <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <span style={{ fontSize: "13px", fontWeight: 600 }}>Priority</span>
                <select
                  value={taskPriority}
                  onChange={(e) => setTaskPriority(e.target.value as any)}
                  style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}
                >
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">🚨 Urgent Priority</option>
                </select>
              </label>

              {/* WhatsApp Interactive Buttons Info Box */}
              <div
                style={{
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  color: "#475569",
                  lineHeight: "1.5",
                }}
              >
                <strong style={{ color: "#0f172a", display: "block", marginBottom: "3px" }}>
                  📱 Interactive WhatsApp Message Preview:
                </strong>
                Message will include two clickable quick buttons:
                <div style={{ display: "flex", gap: "8px", marginTop: "6px" }}>
                  <span style={{ background: "#eff6ff", color: "#0284c7", padding: "3px 8px", borderRadius: "6px", fontWeight: 600, fontSize: "11px", border: "1px solid #bfdbfe" }}>
                    👍 Accept Task
                  </span>
                  <span style={{ background: "#f0fdf4", color: "#16a34a", padding: "3px 8px", borderRadius: "6px", fontWeight: 600, fontSize: "11px", border: "1px solid #bbf7d0" }}>
                    ✅ Task Completed
                  </span>
                </div>
              </div>

              {/* 2-Hour Auto-Remind Checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={autoRemind}
                  onChange={(e) => setAutoRemind(e.target.checked)}
                />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e40af" }}>
                  ⏰ Automatically send WhatsApp reminder every 2 hours until completed
                </span>
              </label>

              {/* Send WhatsApp checkbox */}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  background: "#f0fdf4",
                  border: "1px solid #bbf7d0",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={sendWhatsApp}
                  onChange={(e) => setSendWhatsApp(e.target.checked)}
                />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#166534" }}>
                  Send instant WhatsApp alert to +{staffPhone}
                </span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isActing}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={isActing || !taskTitle.trim() || !staffPhone.trim()}
                  style={{ background: "#22c55e", borderColor: "#16a34a" }}
                >
                  {isActing ? "Assigning & Sending..." : "Assign & Send WhatsApp"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
