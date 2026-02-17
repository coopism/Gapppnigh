import { Router, Request, Response } from "express";
import { db } from "./db";
import { conversations, messages, users, airbnbHosts, properties, hostSessions } from "@shared/schema";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// ========================================
// GUEST MESSAGING ENDPOINTS (requires user auth via req.user)
// ========================================

// Start or get existing conversation with a host
router.post("/api/messages/conversations", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Login required" });
    }

    const { hostId, propertyId, subject, message } = req.body;
    if (!hostId || !message) {
      return res.status(400).json({ error: "hostId and message are required" });
    }

    // Check if conversation already exists for this guest+host+property
    let [existing] = await db
      .select()
      .from(conversations)
      .where(and(
        eq(conversations.guestId, req.user.id),
        eq(conversations.hostId, hostId),
        ...(propertyId ? [eq(conversations.propertyId, propertyId)] : [])
      ))
      .limit(1);

    let convoId: string;
    if (existing) {
      convoId = existing.id;
    } else {
      convoId = uuidv4();
      await db.insert(conversations).values({
        id: convoId,
        guestId: req.user.id,
        hostId,
        propertyId: propertyId || null,
        subject: subject || null,
        lastMessageAt: new Date(),
        hostUnread: 1,
      });
    }

    // Insert the message
    const msgId = uuidv4();
    await db.insert(messages).values({
      id: msgId,
      conversationId: convoId,
      senderId: req.user.id,
      senderType: "guest",
      content: message.trim().slice(0, 2000),
    });

    // Update conversation
    await db.update(conversations).set({
      lastMessageAt: new Date(),
      hostUnread: sql`${conversations.hostUnread} + 1`,
    }).where(eq(conversations.id, convoId));

    res.json({ conversationId: convoId, messageId: msgId });
  } catch (error) {
    console.error("Create conversation error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get guest's conversations
router.get("/api/messages/conversations", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Login required" });
    }

    const convos = await db
      .select({
        id: conversations.id,
        propertyId: conversations.propertyId,
        hostId: conversations.hostId,
        subject: conversations.subject,
        lastMessageAt: conversations.lastMessageAt,
        guestUnread: conversations.guestUnread,
        status: conversations.status,
        createdAt: conversations.createdAt,
        hostName: airbnbHosts.name,
        hostPhoto: airbnbHosts.profilePhoto,
        propertyTitle: properties.title,
      })
      .from(conversations)
      .leftJoin(airbnbHosts, eq(conversations.hostId, airbnbHosts.id))
      .leftJoin(properties, eq(conversations.propertyId, properties.id))
      .where(eq(conversations.guestId, req.user.id))
      .orderBy(desc(conversations.lastMessageAt));

    res.json({ conversations: convos });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get messages in a conversation (guest)
router.get("/api/messages/conversations/:id", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Login required" });
    }

    const convoId = req.params.id as string;

    // Verify guest owns this conversation
    const [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, convoId), eq(conversations.guestId, req.user.id)))
      .limit(1);

    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convoId))
      .orderBy(asc(messages.createdAt));

    // Mark guest unread as 0
    await db.update(conversations).set({ guestUnread: 0 }).where(eq(conversations.id, convoId));

    // Get host info
    const [host] = await db
      .select({ name: airbnbHosts.name, profilePhoto: airbnbHosts.profilePhoto, idVerified: airbnbHosts.idVerified })
      .from(airbnbHosts)
      .where(eq(airbnbHosts.id, convo.hostId))
      .limit(1);

    res.json({ conversation: convo, messages: msgs, host });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message in conversation (guest)
router.post("/api/messages/conversations/:id", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ error: "Login required" });
    }

    const convoId = req.params.id as string;
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Verify guest owns this conversation
    const [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, convoId), eq(conversations.guestId, req.user.id)))
      .limit(1);

    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const msgId = uuidv4();
    await db.insert(messages).values({
      id: msgId,
      conversationId: convoId,
      senderId: req.user.id,
      senderType: "guest",
      content: message.trim().slice(0, 2000),
    });

    await db.update(conversations).set({
      lastMessageAt: new Date(),
      hostUnread: sql`${conversations.hostUnread} + 1`,
    }).where(eq(conversations.id, convoId));

    res.json({ messageId: msgId });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Guest unread count
router.get("/api/messages/unread", async (req: any, res: Response) => {
  try {
    if (!req.user?.id) {
      return res.json({ count: 0 });
    }
    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${conversations.guestUnread}), 0)` })
      .from(conversations)
      .where(eq(conversations.guestId, req.user.id));
    res.json({ count: Number(result?.total || 0) });
  } catch {
    res.json({ count: 0 });
  }
});

// ========================================
// HOST MESSAGING ENDPOINTS (requires host auth via cookie)
// ========================================

async function getHostFromCookie(req: Request): Promise<string | null> {
  const sessionId = req.cookies?.gn_host_session;
  if (!sessionId) return null;
  const [session] = await db
    .select()
    .from(hostSessions)
    .where(eq(hostSessions.id, sessionId))
    .limit(1);
  if (!session || new Date(session.expiresAt) < new Date()) return null;
  return session.hostId;
}

// Get host's conversations
router.get("/api/host/messages/conversations", async (req: Request, res: Response) => {
  try {
    const hostId = await getHostFromCookie(req);
    if (!hostId) return res.status(401).json({ error: "Not authenticated" });

    const convos = await db
      .select({
        id: conversations.id,
        propertyId: conversations.propertyId,
        guestId: conversations.guestId,
        subject: conversations.subject,
        lastMessageAt: conversations.lastMessageAt,
        hostUnread: conversations.hostUnread,
        status: conversations.status,
        createdAt: conversations.createdAt,
        guestName: users.name,
        propertyTitle: properties.title,
      })
      .from(conversations)
      .leftJoin(users, eq(conversations.guestId, users.id))
      .leftJoin(properties, eq(conversations.propertyId, properties.id))
      .where(eq(conversations.hostId, hostId))
      .orderBy(desc(conversations.lastMessageAt));

    res.json({ conversations: convos });
  } catch (error) {
    console.error("Host get conversations error:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
});

// Get messages in a conversation (host)
router.get("/api/host/messages/conversations/:id", async (req: Request, res: Response) => {
  try {
    const hostId = await getHostFromCookie(req);
    if (!hostId) return res.status(401).json({ error: "Not authenticated" });

    const convoId = req.params.id as string;

    const [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, convoId), eq(conversations.hostId, hostId)))
      .limit(1);

    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const msgs = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, convoId))
      .orderBy(asc(messages.createdAt));

    // Mark host unread as 0
    await db.update(conversations).set({ hostUnread: 0 }).where(eq(conversations.id, convoId));

    // Get guest info
    const [guest] = await db
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, convo.guestId))
      .limit(1);

    res.json({ conversation: convo, messages: msgs, guest });
  } catch (error) {
    console.error("Host get messages error:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send message in conversation (host)
router.post("/api/host/messages/conversations/:id", async (req: Request, res: Response) => {
  try {
    const hostId = await getHostFromCookie(req);
    if (!hostId) return res.status(401).json({ error: "Not authenticated" });

    const convoId = req.params.id as string;
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const [convo] = await db
      .select()
      .from(conversations)
      .where(and(eq(conversations.id, convoId), eq(conversations.hostId, hostId)))
      .limit(1);

    if (!convo) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const msgId = uuidv4();
    await db.insert(messages).values({
      id: msgId,
      conversationId: convoId,
      senderId: hostId,
      senderType: "host",
      content: message.trim().slice(0, 2000),
    });

    await db.update(conversations).set({
      lastMessageAt: new Date(),
      guestUnread: sql`${conversations.guestUnread} + 1`,
    }).where(eq(conversations.id, convoId));

    res.json({ messageId: msgId });
  } catch (error) {
    console.error("Host send message error:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Host unread count
router.get("/api/host/messages/unread", async (req: Request, res: Response) => {
  try {
    const hostId = await getHostFromCookie(req);
    if (!hostId) return res.json({ count: 0 });
    const [result] = await db
      .select({ total: sql<number>`COALESCE(SUM(${conversations.hostUnread}), 0)` })
      .from(conversations)
      .where(eq(conversations.hostId, hostId));
    res.json({ count: Number(result?.total || 0) });
  } catch {
    res.json({ count: 0 });
  }
});

export default router;
