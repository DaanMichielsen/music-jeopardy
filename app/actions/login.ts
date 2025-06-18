"use server"

export async function login(password: string) {
  return password === process.env.ADMIN_PASSWORD
}