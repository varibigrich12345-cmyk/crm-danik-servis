import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
        })
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })
        })
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: '1' }, error: null })
          })
        })
      })
    })
  }
}))

describe('claimsService', () => {
  it('should get all claims', async () => {
    // TODO: импортировать и протестировать claimsService.getAll()
    expect(true).toBe(true)
  })

  it('should create claim', async () => {
    // TODO: протестировать claimsService.create()
    expect(true).toBe(true)
  })
})

