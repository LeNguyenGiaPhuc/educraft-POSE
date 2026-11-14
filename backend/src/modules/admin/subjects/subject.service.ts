import { subjectRepository, type SubjectRepository, type SubjectWithCounts } from './subject.repository.js';
import { ConflictError, NotFoundError } from '../../../shared/errors/app-error.js';
import type {
  CreateSubjectInput,
  UpdateSubjectInput,
  UpdateSubjectStatusInput,
} from './subject.schemas.js';

export interface SubjectResponseDto {
  id: string;
  name: string;
  isActive: boolean;
  teacherCount: number;
  classroomCount: number;
}

export class SubjectService {
  constructor(private repo: SubjectRepository = subjectRepository) {}

  toDto(subject: SubjectWithCounts): SubjectResponseDto {
    return {
      id: subject.id,
      name: subject.name,
      isActive: subject.is_active,
      teacherCount: subject._count?.teacherProfiles || 0,
      classroomCount: subject._count?.classroomSubjects || 0,
    };
  }

  async listSubjects(): Promise<SubjectResponseDto[]> {
    const subjects = await this.repo.findMany();
    return subjects.map((s) => this.toDto(s));
  }

  async getSubjectById(id: string): Promise<SubjectResponseDto> {
    const subject = await this.repo.findById(id);
    if (!subject) {
      throw new NotFoundError('Không tìm thấy môn học');
    }
    return this.toDto(subject);
  }

  async createSubject(input: CreateSubjectInput): Promise<SubjectResponseDto> {
    // Case-insensitive duplicate name check
    const existing = await this.repo.findByNameCaseInsensitive(input.name);
    if (existing) {
      throw new ConflictError('Tên môn học đã tồn tại trong hệ thống');
    }

    // Create subject and sync active classrooms atomically
    let created: SubjectWithCounts;
    try {
      created = await this.repo.createSubjectWithActiveClasses(input.name);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictError('Tên môn học đã tồn tại trong hệ thống');
      }
      throw error;
    }
    return this.toDto(created);
  }

  async updateSubject(id: string, input: UpdateSubjectInput): Promise<SubjectResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy môn học');
    }

    // Case-insensitive duplicate check against other subjects
    const duplicate = await this.repo.findByNameCaseInsensitive(input.name, id);
    if (duplicate) {
      throw new ConflictError('Tên môn học đã tồn tại trong hệ thống');
    }

    let updated: SubjectWithCounts;
    try {
      updated = await this.repo.updateName(id, input.name);
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictError('Tên môn học đã tồn tại trong hệ thống');
      }
      throw error;
    }
    return this.toDto(updated);
  }

  async updateStatus(id: string, input: UpdateSubjectStatusInput): Promise<SubjectResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Không tìm thấy môn học');
    }

    const updated = await this.repo.updateStatus(id, input.isActive);
    return this.toDto(updated);
  }
}

export const subjectService = new SubjectService();
